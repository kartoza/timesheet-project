from django.db import models


class Project(models.Model):

    erp_id = models.CharField(
        help_text='Project ID from erpnext',
        max_length=256,
        default='',
        blank=True
    )

    updated = models.DateTimeField(
        null=True,
        blank=True
    )

    name = models.CharField(
        help_text='Name of the project',
        max_length=512,
        blank=False,
        null=False
    )

    is_active = models.BooleanField(
        default=False
    )

    def __str__(self):
        return self.name


class ProjectLink(models.Model):
    CATEGORY_CHOICES = (
        ('DOC', 'Documentation'),
        ('CHA', 'Chat'),
        ('REP', 'Repository'),
        ('DIA', 'Diagram')
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
    )

    name = models.CharField(
        blank=True,
        null=True,
        max_length=512,
        default='',
    )

    category = models.CharField(
        blank=True,
        choices=CATEGORY_CHOICES,
        max_length=3
    )

    link = models.URLField(
        blank=False,
        null=False,
    )

    display_order = models.PositiveIntegerField(
        default=0,
    )

    def __str__(self):
        return f'[{self.project.name}] {self.link}'

    def save(self, *args, **kwargs):
        if self.display_order == 0:
            last_order = (
                ProjectLink.objects.filter(project=self.project)
                .aggregate(
                    max_order=models.Max('display_order')
                )['max_order']
            )
            self.display_order = (last_order or 0) + 1
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['project_id', 'display_order']
