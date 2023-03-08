from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers

from django.contrib.auth import get_user_model

from schedule.models import UserProjectSlot


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

    def get(self, request, format=None):
        users = get_user_model().objects.filter(
            profile__api_key__isnull=False
        )
        users_data = []
        for user in users:
            users_data.append({
                'user_id': user.id,
                'user_name': (
                    user.first_name if user.first_name else user.username
                ),
                'slotted_projects': UserProjectSerializer(
                    UserProjectSlot.objects.filter(
                        user=user
                    ), many=True
                ).data
            })
        return Response(
            users_data
        )
