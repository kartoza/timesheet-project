import factory
import datetime

from timesheet.models import *


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = get_user_model()

    username = factory.Sequence(lambda n: 'User %s' % n)
    email = factory.LazyAttribute(lambda o: '%s@example.org' % o.username)
    password = factory.PostGenerationMethodCall('set_password', 'password')


class ProjectFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Project

    name = factory.Sequence(lambda n: 'Project %s' % n)
    is_active = True


class TaskFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Task

    name = factory.Sequence(lambda n: 'Task %s' % n)
    project = factory.SubFactory(ProjectFactory)


class TimelogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Timelog

    user = factory.SubFactory(UserFactory)
    start_time = factory.LazyFunction(datetime.datetime.now)
    end_time = factory.LazyFunction(lambda: datetime.datetime.now() + datetime.timedelta(hours=1))
    task = factory.SubFactory(TaskFactory)
