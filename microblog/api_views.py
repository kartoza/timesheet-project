from django.db.models import BooleanField, Case, Value, When
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers
from drf_spectacular.utils import extend_schema

from microblog.models import Post, Tag, Like


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']


class PostSerializer(serializers.ModelSerializer):
    authorName = serializers.SerializerMethodField()
    authorHandle = serializers.SerializerMethodField()
    avatarUrl = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at')
    isPinned = serializers.BooleanField(source='is_pinned')
    pinValidUntil = serializers.DateTimeField(source='pin_valid_until')
    periodStart = serializers.DateTimeField(source='period_start')
    periodEnd = serializers.DateTimeField(source='period_end')
    tags = TagSerializer(many=True)
    likesCount = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    isOwner = serializers.SerializerMethodField()
    type = serializers.CharField()

    def get_authorName(self, obj):
        full_name = obj.author.get_full_name()
        return full_name if full_name else obj.author.username

    def get_authorHandle(self, obj):
        return obj.author.username

    def get_avatarUrl(self, obj):
        try:
            if obj.author.profile.profile_picture:
                return obj.author.profile.profile_picture.url
        except Exception:
            pass
        return None

    def get_likesCount(self, obj):
        return obj.likes.count()

    def get_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False

    def get_isOwner(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.author_id == request.user.pk
        return False

    class Meta:
        model = Post
        fields = [
            'id',
            'authorName',
            'authorHandle',
            'avatarUrl',
            'content',
            'createdAt',
            'isPinned',
            'pinValidUntil',
            'periodStart',
            'periodEnd',
            'tags',
            'likesCount',
            'liked',
            'isOwner',
            'type',
        ]


PAGE_SIZE = 10


@extend_schema(exclude=True)
class MicroblogPostListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        posts = (
            Post.objects.visible()
            .annotate(
                pin_active=Case(
                    When(is_pinned=True, pin_valid_until__isnull=True, then=Value(True)),
                    When(is_pinned=True, pin_valid_until__gte=now, then=Value(True)),
                    default=Value(False),
                    output_field=BooleanField(),
                )
            )
            .order_by('-pin_active', '-created_at')
            .prefetch_related('tags', 'likes')
        )

        try:
            page = max(1, int(request.query_params.get('page', 1)))
        except (ValueError, TypeError):
            page = 1

        total = posts.count()
        start = (page - 1) * PAGE_SIZE
        end = start + PAGE_SIZE
        page_qs = posts[start:end]

        serializer = PostSerializer(page_qs, many=True, context={'request': request})
        return Response({
            'results': serializer.data,
            'count': total,
            'next': end < total,
        })


class PostCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=666)
    type = serializers.ChoiceField(choices=[c[0] for c in Post.TYPE_CHOICES], default='default')
    tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    is_pinned = serializers.BooleanField(required=False, default=False)
    pin_valid_until = serializers.DateTimeField(required=False, allow_null=True, default=None)
    period_start = serializers.DateTimeField(required=False, allow_null=True, default=None)
    period_end = serializers.DateTimeField(required=False, allow_null=True, default=None)

    def validate(self, attrs):
        request = self.context.get('request')
        is_pinned = attrs.get('is_pinned')
        pin_valid_until = attrs.get('pin_valid_until')

        if self.partial and self.instance is not None:
            if is_pinned is None:
                is_pinned = self.instance.is_pinned
            if 'pin_valid_until' not in attrs:
                pin_valid_until = self.instance.pin_valid_until

        if is_pinned:
            if request and not (request.user.is_staff or request.user.is_superuser):
                raise serializers.ValidationError({
                    'is_pinned': 'Only staff members can pin posts.'
                })
            if not pin_valid_until:
                raise serializers.ValidationError({
                    'pin_valid_until': 'This field is required when the post is pinned.'
                })

        return attrs


@extend_schema(exclude=True)
class MicroblogPostCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PostCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        post = Post.objects.create(
            author=request.user,
            content=data['content'],
            type=data['type'],
            is_pinned=data['is_pinned'],
            pin_valid_until=data.get('pin_valid_until'),
            period_start=data.get('period_start'),
            period_end=data.get('period_end'),
        )

        for tag_name in data.get('tags', []):
            tag_name = tag_name.strip().lstrip('#')
            if tag_name:
                tag, _ = Tag.objects.get_or_create(name=tag_name)
                post.tags.add(tag)

        return Response(PostSerializer(post, context={'request': request}).data, status=201)


@extend_schema(exclude=True)
class MicroblogPostUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, post_id):
        try:
            post = Post.objects.get(pk=post_id, author=request.user)
        except Post.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        serializer = PostCreateSerializer(instance=post, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if 'content' in data:
            post.content = data['content']
        if 'type' in data:
            post.type = data['type']
        if 'is_pinned' in data:
            post.is_pinned = data['is_pinned']
        if 'pin_valid_until' in data:
            post.pin_valid_until = data['pin_valid_until']
        if 'period_start' in data:
            post.period_start = data['period_start']
        if 'period_end' in data:
            post.period_end = data['period_end']
        post.save()

        if 'tags' in data:
            post.tags.clear()
            for tag_name in data['tags']:
                tag_name = tag_name.strip().lstrip('#')
                if tag_name:
                    tag, _ = Tag.objects.get_or_create(name=tag_name)
                    post.tags.add(tag)

        return Response(PostSerializer(post, context={'request': request}).data)


@extend_schema(exclude=True)
class MicroblogPostDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, post_id):
        try:
            post = Post.objects.get(pk=post_id, author=request.user)
        except Post.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        post.delete()
        return Response(status=204)


@extend_schema(exclude=True)
class MicroblogPostLikeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, post_id):
        try:
            post = Post.objects.visible().get(pk=post_id)
        except Post.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        like = Like.objects.filter(post=post, user=request.user).first()
        if like:
            like.delete()
            liked = False
        else:
            Like.objects.create(post=post, user=request.user)
            liked = True

        return Response({
            'liked': liked,
            'likesCount': post.likes.count(),
        })
