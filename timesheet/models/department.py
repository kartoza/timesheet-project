from django.contrib.auth.models import Group
from django.db import models


class Department(models.Model):
    erp_id = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255)
    group = models.ForeignKey(
        Group,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='departments'
    )

    def __str__(self):
        return self.erp_id

    class Meta:
        ordering = ['erp_id']
