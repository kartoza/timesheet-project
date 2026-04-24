from django.contrib import admin
from django import forms
from django.contrib.admin.widgets import AdminSplitDateTime

from microblog.models import Like, Post, Tag
from microblog.models.scheduled_post_config import ScheduledPostConfig


class PostAdminForm(forms.ModelForm):
    period_start = forms.SplitDateTimeField(
        required=False,
        widget=AdminSplitDateTime
    )
    period_end = forms.SplitDateTimeField(
        required=False,
        widget=AdminSplitDateTime
    )

    class Meta:
        model = Post
        fields = '__all__'


class PostAdmin(admin.ModelAdmin):
    form = PostAdminForm
    list_display = (
        'author',
        'type',
        'total_likes',
        'period_start',
        'period_end',
        'is_visible_now',
        'is_published',
        'is_pinned',
        'pin_valid_until',
        'created_at',
        'updated_at',
    )
    list_filter = (
        'type',
        'is_published',
        'is_pinned',
        'period_start',
        'period_end',
        'created_at',
    )
    search_fields = (
        'content',
        'type',
        'tags__name',
        'author__username',
    )
    raw_id_fields = ('author',)
    filter_horizontal = ('tags',)
    fieldsets = (
        (
            None,
            {
                'fields': (
                    'author',
                    'content',
                    'type',
                    'tags',
                )
            }
        ),
        (
            'Visibility',
            {
                'fields': (
                    'is_published',
                    ('period_start', 'period_end'),
                    'is_pinned',
                    'pin_valid_until',
                )
            }
        ),
    )

    def total_likes(self, obj):
        return obj.likes.count()

    def is_visible_now(self, obj):
        return obj.is_visible


class LikeAdmin(admin.ModelAdmin):
    list_display = (
        'post',
        'user',
        'created_at',
    )
    raw_id_fields = (
        'post',
        'user',
    )
    search_fields = (
        'post__content',
        'user__username',
    )


class TagAdmin(admin.ModelAdmin):
    search_fields = ('name',)


class ScheduledPostConfigAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'rss_url',
        'post_type',
        'posts_per_day',
        'display_duration_hours',
        'is_active',
        'author',
        'last_fetched_at',
        'updated_at',
    )
    list_filter = ('is_active', 'post_type')
    search_fields = ('name', 'rss_url', 'author__username')
    raw_id_fields = ('author',)
    filter_horizontal = ('tags',)
    readonly_fields = ('last_fetched_at', 'last_item_guid', 'created_at', 'updated_at')
    fieldsets = (
        (
            None,
            {
                'fields': (
                    'name',
                    'rss_url',
                    'post_type',
                    'tags',
                    'author',
                    'is_active',
                )
            }
        ),
        (
            'Schedule',
            {
                'fields': (
                    'posts_per_day',
                    'display_duration_hours',
                )
            }
        ),
        (
            'State',
            {
                'fields': (
                    'last_fetched_at',
                    'last_item_guid',
                    'created_at',
                    'updated_at',
                ),
                'classes': ('collapse',),
            }
        ),
    )


admin.site.register(Post, PostAdmin)
admin.site.register(Like, LikeAdmin)
admin.site.register(Tag, TagAdmin)
admin.site.register(ScheduledPostConfig, ScheduledPostConfigAdmin)
