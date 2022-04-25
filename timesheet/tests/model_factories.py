import factory
import datetime

from django.contrib.auth import get_user_model

from timesheet.models import *


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = get_user_model()

    username = factory.Sequence(lambda n: 'User %s' % n)
    email = factory.LazyAttribute(lambda o: '%s@example.org' % o.username)
    password = factory.PostGenerationMethodCall('set_password', 'password')


class TaskFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Task

    name = factory.Sequence(lambda n: 'Task %s' % n)


class TimesheetFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Timesheet

    user = factory.SubFactory(UserFactory)
    start_time = factory.LazyFunction(datetime.datetime.now)
    task = factory.SubFactory(TaskFactory)
