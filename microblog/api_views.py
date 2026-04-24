from django.db.models import BooleanField, Case, Value, When
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, inline_serializer
from drf_spectacular.types import OpenApiTypes

from microblog.models import Post, Tag, Like
from microblog.models.scheduled_post_config import ScheduledPostConfig


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


@extend_schema(
    tags=['Updates'],
    summary='List posts',
    description='Returns a paginated list of visible posts, with pinned posts sorted to the top.',
    parameters=[
        OpenApiParameter('page', OpenApiTypes.INT, OpenApiParameter.QUERY, description='Page number (default: 1)'),
    ],
    responses={
        200: inline_serializer('PostListResponse', fields={
            'results': PostSerializer(many=True),
            'count': serializers.IntegerField(),
            'next': serializers.BooleanField(),
        }),
    },
)
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


@extend_schema(
    tags=['Updates'],
    summary='Create a post',
    description='Creates a new post. Pinning requires staff permissions.',
    request=PostCreateSerializer,
    responses={201: PostSerializer},
)
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


@extend_schema(
    tags=['Updates'],
    summary='Update a post',
    description='Partially updates a post. Only the post author can update it.',
    request=PostCreateSerializer,
    responses={200: PostSerializer, 404: OpenApiResponse(description='Post not found.')},
)
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


@extend_schema(
    tags=['Updates'],
    summary='Delete a post',
    description='Deletes a post. Only the post author can delete it.',
    responses={204: OpenApiResponse(description='Deleted.'), 404: OpenApiResponse(description='Post not found.')},
)
class MicroblogPostDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, post_id):
        try:
            post = Post.objects.get(pk=post_id, author=request.user)
        except Post.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        post.delete()
        return Response(status=204)


@extend_schema(
    tags=['Updates'],
    summary='Like or unlike a post',
    description='Toggles the like state for the authenticated user on the given post.',
    responses={
        200: inline_serializer('LikeResponse', fields={
            'liked': serializers.BooleanField(),
            'likesCount': serializers.IntegerField(),
        }),
        404: OpenApiResponse(description='Post not found.'),
    },
)
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


# ---------------------------------------------------------------------------
# Scheduled Post Config
# ---------------------------------------------------------------------------

class ScheduledPostConfigSerializer(serializers.ModelSerializer):
    tags = TagSerializer(many=True, read_only=True)
    authorName = serializers.SerializerMethodField()

    def get_authorName(self, obj):
        full_name = obj.author.get_full_name()
        return full_name if full_name else obj.author.username

    class Meta:
        model = ScheduledPostConfig
        fields = [
            'id',
            'name',
            'rss_url',
            'post_type',
            'posts_per_day',
            'display_duration_hours',
            'is_active',
            'author',
            'authorName',
            'tags',
            'last_fetched_at',
            'last_item_guid',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['last_fetched_at', 'last_item_guid', 'created_at', 'updated_at']


class ScheduledPostConfigWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    rss_url = serializers.URLField()
    post_type = serializers.ChoiceField(choices=[c[0] for c in Post.TYPE_CHOICES], default='default')
    posts_per_day = serializers.IntegerField(min_value=1, max_value=100, default=1)
    display_duration_hours = serializers.IntegerField(min_value=1, default=24)
    is_active = serializers.BooleanField(default=True)
    tags = serializers.ListField(child=serializers.CharField(), required=False, default=list)


@extend_schema(
    tags=['Updates'],
    summary='List scheduled post configs',
    description='Returns all RSS-based scheduled post configs. Staff only.',
    responses={200: ScheduledPostConfigSerializer(many=True)},
)
class ScheduledPostConfigListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        configs = ScheduledPostConfig.objects.prefetch_related('tags').all()
        return Response(ScheduledPostConfigSerializer(configs, many=True).data)


@extend_schema(
    tags=['Updates'],
    summary='Create scheduled post config',
    description='Creates a new RSS-based scheduled post config. Staff only.',
    request=ScheduledPostConfigWriteSerializer,
    responses={201: ScheduledPostConfigSerializer},
)
class ScheduledPostConfigCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = ScheduledPostConfigWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        config = ScheduledPostConfig.objects.create(
            name=data['name'],
            rss_url=data['rss_url'],
            post_type=data['post_type'],
            posts_per_day=data['posts_per_day'],
            display_duration_hours=data['display_duration_hours'],
            is_active=data['is_active'],
            author=request.user,
        )
        for tag_name in data.get('tags', []):
            tag_name = tag_name.strip().lstrip('#')
            if tag_name:
                tag, _ = Tag.objects.get_or_create(name=tag_name)
                config.tags.add(tag)

        return Response(ScheduledPostConfigSerializer(config).data, status=201)


@extend_schema(
    tags=['Updates'],
    summary='Update scheduled post config',
    description='Partially updates a scheduled post config. Staff only.',
    request=ScheduledPostConfigWriteSerializer,
    responses={200: ScheduledPostConfigSerializer, 404: OpenApiResponse(description='Not found.')},
)
class ScheduledPostConfigUpdateView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, config_id):
        try:
            config = ScheduledPostConfig.objects.get(pk=config_id)
        except ScheduledPostConfig.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)

        serializer = ScheduledPostConfigWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        for field in ('name', 'rss_url', 'post_type', 'posts_per_day', 'display_duration_hours', 'is_active'):
            if field in data:
                setattr(config, field, data[field])
        config.save()

        if 'tags' in data:
            config.tags.clear()
            for tag_name in data['tags']:
                tag_name = tag_name.strip().lstrip('#')
                if tag_name:
                    tag, _ = Tag.objects.get_or_create(name=tag_name)
                    config.tags.add(tag)

        return Response(ScheduledPostConfigSerializer(config).data)


@extend_schema(
    tags=['Updates'],
    summary='Delete scheduled post config',
    description='Deletes a scheduled post config. Staff only.',
    responses={204: OpenApiResponse(description='Deleted.'), 404: OpenApiResponse(description='Not found.')},
)
class ScheduledPostConfigDeleteView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, config_id):
        try:
            config = ScheduledPostConfig.objects.get(pk=config_id)
        except ScheduledPostConfig.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)
        config.delete()
        return Response(status=204)
