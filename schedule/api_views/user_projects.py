from django.http import Http404
from rest_framework.permissions import IsAdminUser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers

from django.contrib.auth import get_user_model

from schedule.models import UserProjectSlot
from timesheet.models import Project


class UserProjectSerializer(serializers.ModelSerializer):
    project_name = serializers.SerializerMethodField()

    def get_project_name(self, obj: UserProjectSlot):
        return obj.project.name

    def get_user_name(self, obj: UserProjectSlot):
        return (
            obj.user.first_name if obj.user.first_name else obj.user.username
        )

    class Meta:
        model = UserProjectSlot
        fields = [
            'id',
            'project',
            'project_name',
            'active'
        ]


class UserProjectList(APIView):
    permission_classes = []

    def get(self, request, format=None):
        timeline_id = self.request.GET.get('timelineId', None)
        if not timeline_id:
            if request.user.is_anonymous:
                return Response([])
        if timeline_id:
            projects = Project.objects.filter(
                publictimeline__id=timeline_id
            )
            users = get_user_model().objects.filter(
                userprojectslot__project__in=projects
            ).distinct()
        else:
            users = get_user_model().objects.filter(
                profile__api_key__isnull=False
            )
        users_data = []
        for user in users:
            user_projects = UserProjectSlot.objects.filter(
                user=user,
                active=True
            )
            if timeline_id:
                user_projects = user_projects.filter(
                    project__publictimeline__id=timeline_id
                )
            user_data = {
                'user_id': user.id,
                'user_name': (
                    user.first_name if user.first_name else user.username
                ),
                'slotted_projects': UserProjectSerializer(
                    user_projects, many=True
                ).data
            }
            if self.request.user.id == user.id:
                users_data.insert(0, user_data)
            else:
                users_data.append(user_data)
        return Response(
            users_data
        )


class AddUserProjectSlot(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        project_id = request.data.get('project_id', None)
        user_id = request.data.get('user_id', None)
        if not project_id or not user_id:
            raise Http404()
        project = Project.objects.get(id=project_id)
        order = (
            UserProjectSlot.objects.filter(user_id=user_id).count() + 1
        )
        user_project, created = UserProjectSlot.objects.get_or_create(
            user_id=user_id,
            project=project,
            defaults={
                'order': order,
                'active': True
            }
        )
        return Response(
            UserProjectSerializer(user_project, many=False).data
        )


class RemoveUserProject(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        project_id = request.data.get('project_id', None)
        user_id = request.data.get('user_id', None)
        if not project_id or not user_id:
            raise Http404()
        try:
            user_project = UserProjectSlot.objects.get(
                user_id=user_id,
                project_id=project_id
            )
            user_project.active = False
            user_project.save()
            return Response({
                'updated': True
            })
        except UserProjectSlot.DoesNotExist:
            raise Http404()
