from django.contrib import admin

from microblog.models import Like, Post, Tag


class PostAdmin(admin.ModelAdmin):
    list_display = (
        'author',
        'type',
        'total_likes',
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

    def total_likes(self, obj):
        return obj.likes.count()


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


admin.site.register(Post, PostAdmin)
admin.site.register(Like, LikeAdmin)
admin.site.register(Tag, TagAdmin)
