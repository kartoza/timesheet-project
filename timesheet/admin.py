from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django import forms
from django.db import transaction
from django.db.models import Count
from django.template.response import TemplateResponse
from django.test import Client
from django.core.exceptions import PermissionDenied
from django.http import HttpResponse, HttpResponseRedirect
from django.urls import path, reverse
from preferences.admin import PreferencesAdmin


from timesheet.models import (
    Timelog, Task, Project, Activity, TimesheetPreferences,
    SavedSummary, ProjectLink, WordleGame, WordleGuess,
    ConnectionsPuzzle, ConnectionsGame, ConnectionsAttempt
)
from timesheet.models.project_member import ProjectMember
from timesheet.models.clock import Clock
from timesheet.utils.erp import (
    push_timesheet_to_erp, pull_projects_from_erp, pull_user_data_from_erp,
    pull_leave_data_from_erp, pull_holiday_list, generate_api_key as generate_api_key_from_erp
)
from timesheet.models.profile import Profile
from timesheet.models.user_project import UserProject
from timesheet.forms import ProfileForm
from timesheet.utils.connections import (
    GROUP_COUNT, clean_groups, parse_puzzles_csv, puzzle_key, puzzles_to_csv
)
from timesheet.utils.timelogs import split_timelog_by_description


class TimesheetPreferencesForm(forms.ModelForm):
    class Meta:
        model = TimesheetPreferences
        fields = '__all__'
        widgets = {
            'map_api_key': forms.PasswordInput(render_value=True),
            'admin_token': forms.PasswordInput(render_value=True),
        }


@admin.action(description='Push to ERP')
def push_to_erp(modeladmin, request, queryset: Timelog.objects):
    queryset = queryset.filter(submitted=False)
    if queryset.exists():
        user = queryset.first().user
        push_timesheet_to_erp(queryset, user)


@admin.action(description='Pull projects')
def pull_projects(modeladmin, request, queryset: get_user_model()):
    for user in queryset:
        if not user.profile.token and not user.profile.erpnext_oauth_token:
            continue
        pull_projects_from_erp(user)


@admin.action(description='Pull user data')
def pull_user_data(modeladmin, request, queryset: get_user_model()):
    for user in queryset:
        pull_user_data_from_erp(user)


@admin.action(description='Generate api key')
def generate_api_key(modeladmin, request, queryset: get_user_model()):
    for user in queryset:
        generate_api_key_from_erp(user)


@admin.action(description='Pull leave data')
def pull_leave_data(modeladmin, request, queryset: get_user_model()):
    for user in queryset:
        if not user.profile.token and not user.profile.erpnext_oauth_token:
            continue
        pull_leave_data_from_erp(user)
        pull_holiday_list(user)


@admin.action(description='Merge users')
def merge_users(modeladmin, request, queryset):
    from schedule.models.schedule import Schedule
    from schedule.models.user_project_slot import UserProjectSlot
    from microblog.models.post import Like

    if 'primary_user_id' in request.POST:
        primary_id = int(request.POST['primary_user_id'])
        primary = get_user_model().objects.get(id=primary_id)
        sources = queryset.exclude(id=primary_id)

        with transaction.atomic():
            for source in sources:
                Timelog.objects.filter(user=source).update(user=primary)
                Schedule.objects.filter(user=source).update(user=primary)

                for slot in UserProjectSlot.objects.filter(user=source):
                    if not UserProjectSlot.objects.filter(user=primary, project=slot.project).exists():
                        slot.user = primary
                        slot.save()
                    else:
                        slot.delete()

                for up in UserProject.objects.filter(user=source):
                    if not UserProject.objects.filter(user=primary, project=up.project).exists():
                        up.user = primary
                        up.save()
                    else:
                        up.delete()

                for pm in ProjectMember.objects.filter(user=source):
                    if not ProjectMember.objects.filter(user=primary, project=pm.project).exists():
                        pm.user = primary
                        pm.save()
                    else:
                        pm.delete()

                for like in Like.objects.filter(user=source):
                    if not Like.objects.filter(user=primary, post=like.post).exists():
                        like.user = primary
                        like.save()
                    else:
                        like.delete()

                username = source.username
                source.delete()
                messages.success(request, f'Merged "{username}" into "{primary.username}".')

        return None

    user_ids = list(queryset.values_list('id', flat=True))
    return TemplateResponse(request, 'admin/merge_users.html', {
        'users': queryset,
        'user_ids': user_ids,
        'opts': modeladmin.model._meta,
        'title': 'Merge users',
    })


@admin.action(description='Break timesheet')
def trigger_break_timesheet_api(modeladmin, request, queryset):
    total_created = 0
    for timelog in queryset:
        total_created += split_timelog_by_description(timelog)
    messages.success(
        request,
        f"Split timelog successfully. {total_created} child timelog(s) created."
    )


class TimelogAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'activity',
        'task',
        'start_time',
        'end_time',
        'submitted'
    )
    list_filter = (
        'user',
        'submitted'
    )
    actions = [push_to_erp, trigger_break_timesheet_api]
    raw_id_fields = (
        'task',
        'project',
        'parent',
    )


class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'project',
        'actual_time',
        'expected_time',
        'last_update'
    )
    readonly_fields = (
        'last_update',
    )
    search_fields = (
        'name',
        'project__name'
    )


class ProjectLinkInline(admin.StackedInline):
    model = ProjectLink
    extra = 1
    fields = ('name', 'link', 'category', 'display_order')
    ordering = ('display_order',)


class ProjectMemberInline(admin.TabularInline):
    model = ProjectMember
    extra = 1
    fields = ('user', 'role', 'project_lead')


class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'is_active'
    )
    search_fields = (
        'name',
    )
    list_filter = (
        'is_active',
    )
    fieldsets = (
        (None, {
            'fields': ('name', 'erp_id', 'is_active', 'project_type', 'business_unit', 'customer'),
        }),
        ('Team', {
            'fields': ('project_lead', 'relations_manager'),
        }),
        ('Timeline', {
            'fields': ('expected_start_date', 'expected_end_date', 'updated'),
        }),
        ('Progress', {
            'fields': ('expected_time', 'actual_time', 'progress_in_hours', 'percent_complete', 'rag'),
        }),
        ('Financials', {
            'fields': (
                'estimated_costing',
                'total_sales_amount',
                'total_costing_amount',
                'total_billable_amount',
                'total_billed_amount',
                'gross_margin',
                'per_gross_margin',
            ),
        }),
    )
    inlines = (
        ProjectLinkInline,
        ProjectMemberInline,
    )


class ActivityAdmin(admin.ModelAdmin):
    list_display = (
        'name',
    )


class ProfileInLine(admin.StackedInline):
    model = Profile
    form = ProfileForm


class UserAdmin(DjangoUserAdmin):
    inlines = [ProfileInLine, ]
    actions = [pull_projects, pull_user_data, pull_leave_data, generate_api_key, merge_users]


class SavedSummaryAdmin(admin.ModelAdmin):
    raw_id_fields = ['project']
    list_display = [
        'name',
        'active',
        'last_updated'
    ]


class UserProjectAdmin(admin.ModelAdmin):
    list_display = (
        'project',
        'user'
    )


class TimesheetPreferencesAdmin(PreferencesAdmin):
    form = TimesheetPreferencesForm


admin.site.register(Timelog, TimelogAdmin)
admin.site.register(Task, TaskAdmin)
admin.site.register(Project, ProjectAdmin)
admin.site.register(Activity, ActivityAdmin)
admin.site.unregister(get_user_model())
admin.site.register(get_user_model(), UserAdmin)
admin.site.register(UserProject, UserProjectAdmin)
admin.site.register(TimesheetPreferences, TimesheetPreferencesAdmin)
admin.site.register(Clock)
admin.site.register(SavedSummary, SavedSummaryAdmin)


class WordleGuessInline(admin.TabularInline):
    model = WordleGuess
    extra = 0
    readonly_fields = ('user', 'guess', 'guess_date', 'created_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(WordleGame)
class WordleGameAdmin(admin.ModelAdmin):
    """The word is encrypted and kept hidden until the game is finished, so
    admins can play without seeing the answer."""
    list_display = (
        'id', 'revealed_word', 'is_finished', 'winner', 'guess_count',
        'created_at', 'finished_at'
    )
    list_filter = ('is_finished',)
    search_fields = ('winner__username', 'winner__first_name')
    fields = (
        'revealed_word', 'is_finished', 'winner', 'created_at', 'finished_at'
    )
    readonly_fields = (
        'revealed_word', 'is_finished', 'winner', 'created_at', 'finished_at'
    )
    inlines = [WordleGuessInline]

    def has_add_permission(self, request):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _guess_count=Count('guesses')
        )

    @admin.display(description='Word')
    def revealed_word(self, obj):
        return obj.word if obj.is_finished else '(hidden until finished)'

    @admin.display(description='Guesses', ordering='_guess_count')
    def guess_count(self, obj):
        return obj._guess_count


class ConnectionsAttemptInline(admin.TabularInline):
    model = ConnectionsAttempt
    extra = 0
    readonly_fields = (
        'user', 'words', 'group_index', 'one_away', 'attempt_date',
        'created_at'
    )
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ConnectionsGame)
class ConnectionsGameAdmin(admin.ModelAdmin):
    """The groups are hidden until the game is finished, so admins can play
    without seeing the answers."""
    list_display = (
        'id', 'revealed_groups', 'is_finished', 'attempt_count',
        'created_at', 'finished_at'
    )
    list_filter = ('is_finished',)
    fields = (
        'revealed_groups', 'is_finished', 'created_at', 'finished_at'
    )
    readonly_fields = fields
    inlines = [ConnectionsAttemptInline]

    def has_add_permission(self, request):
        return False

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(
            _attempt_count=Count('attempts')
        )

    @admin.display(description='Groups')
    def revealed_groups(self, obj):
        if not obj.is_finished:
            return '(hidden until finished)'
        return ' | '.join(g['category'] for g in obj.groups)

    @admin.display(description='Attempts', ordering='_attempt_count')
    def attempt_count(self, obj):
        return obj._attempt_count


GROUP_LEVELS = ['yellow, easiest', 'green', 'blue', 'purple, hardest']


def _category_field(i):
    return forms.CharField(label=f'Group {i + 1} category ({GROUP_LEVELS[i]})')


def _words_field(i):
    return forms.CharField(
        label=f'Group {i + 1} words',
        help_text='Four words separated by commas.'
    )


class ConnectionsPuzzleForm(forms.ModelForm):
    """Edit the four groups as a category plus a comma separated word list."""

    category_0 = _category_field(0)
    words_0 = _words_field(0)
    category_1 = _category_field(1)
    words_1 = _words_field(1)
    category_2 = _category_field(2)
    words_2 = _words_field(2)
    category_3 = _category_field(3)
    words_3 = _words_field(3)

    class Meta:
        model = ConnectionsPuzzle
        fields = ('status',)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        groups = self.instance.groups if self.instance.pk else []
        for i, group in enumerate(groups[:GROUP_COUNT]):
            self.fields[f'category_{i}'].initial = group.get('category', '')
            self.fields[f'words_{i}'].initial = ', '.join(group.get('words', []))

    def clean(self):
        cleaned = super().clean()
        groups = [
            {
                'category': cleaned.get(f'category_{i}', ''),
                'words': [
                    w for w in cleaned.get(f'words_{i}', '').replace(
                        '\n', ','
                    ).split(',') if w.strip()
                ],
            } for i in range(GROUP_COUNT)
        ]
        try:
            cleaned['groups'] = clean_groups(groups)
        except ValueError as error:
            raise forms.ValidationError(str(error))
        return cleaned

    def save(self, commit=True):
        self.instance.groups = self.cleaned_data['groups']
        return super().save(commit=commit)


class ConnectionsPuzzleImportForm(forms.Form):
    csv_file = forms.FileField(label='CSV file')
    approve = forms.BooleanField(
        required=False,
        label='Approve the puzzles right away',
        help_text='Leave unchecked to save them as drafts and review them first.'
    )


@admin.register(ConnectionsPuzzle)
class ConnectionsPuzzleAdmin(admin.ModelAdmin):
    form = ConnectionsPuzzleForm
    change_list_template = 'admin/timesheet/connectionspuzzle/change_list.html'
    list_display = ('id', '__str__', 'status', 'source', 'created_at')
    list_filter = ('status', 'source')
    actions = ['approve_puzzles', 'archive_puzzles']

    def get_urls(self):
        urls = [
            path(
                'import-csv/',
                self.admin_site.admin_view(self.import_csv_view),
                name='timesheet_connectionspuzzle_import_csv'
            ),
            path(
                'export-csv/',
                self.admin_site.admin_view(self.export_csv_view),
                name='timesheet_connectionspuzzle_export_csv'
            ),
        ]
        return urls + super().get_urls()

    def import_csv_view(self, request):
        if not self.has_add_permission(request):
            raise PermissionDenied
        changelist = reverse('admin:timesheet_connectionspuzzle_changelist')
        form = ConnectionsPuzzleImportForm(request.POST or None, request.FILES or None)
        if request.method == 'POST' and form.is_valid():
            try:
                text = form.cleaned_data['csv_file'].read().decode('utf-8')
            except UnicodeDecodeError:
                self.message_user(
                    request, 'The file must be UTF-8 encoded.', messages.ERROR)
                return HttpResponseRedirect(request.path)
            puzzles, errors = parse_puzzles_csv(text)
            existing = {puzzle_key(p.groups) for p in ConnectionsPuzzle.objects.all()}
            status = (
                ConnectionsPuzzle.Status.APPROVED if form.cleaned_data['approve']
                else ConnectionsPuzzle.Status.DRAFT
            )
            created = 0
            with transaction.atomic():
                for row_number, groups in puzzles:
                    if puzzle_key(groups) in existing:
                        errors.append(f'Row {row_number}: this puzzle already exists.')
                        continue
                    ConnectionsPuzzle.objects.create(
                        groups=groups, status=status,
                        source=ConnectionsPuzzle.Source.IMPORTED
                    )
                    created += 1
            if created:
                self.message_user(
                    request,
                    f'{created} puzzle(s) imported as {status}.',
                    messages.SUCCESS
                )
            for error in errors:
                self.message_user(request, f'Skipped - {error}', messages.WARNING)
            if not created and not errors:
                self.message_user(
                    request, 'The file has no puzzles.', messages.WARNING)
            return HttpResponseRedirect(changelist)
        context = dict(
            self.admin_site.each_context(request),
            opts=self.model._meta,
            form=form,
            title='Import Connections puzzles from CSV',
            changelist_url=changelist,
        )
        return TemplateResponse(
            request, 'admin/timesheet/connectionspuzzle/import_csv.html', context)

    def export_csv_view(self, request):
        if not self.has_view_permission(request):
            raise PermissionDenied
        puzzles = ConnectionsPuzzle.objects.order_by('id')
        response = HttpResponse(
            puzzles_to_csv([p.groups for p in puzzles]), content_type='text/csv')
        response['Content-Disposition'] = (
            'attachment; filename="connections_puzzles.csv"')
        return response

    def get_fields(self, request, obj=None):
        fields = []
        for i in range(GROUP_COUNT):
            fields += [f'category_{i}', f'words_{i}']
        return fields + ['status']

    def save_model(self, request, obj, form, change):
        if not change:
            obj.source = ConnectionsPuzzle.Source.MANUAL
        super().save_model(request, obj, form, change)

    @admin.action(description='Approve selected puzzles')
    def approve_puzzles(self, request, queryset):
        count = queryset.update(status=ConnectionsPuzzle.Status.APPROVED)
        self.message_user(request, f'{count} puzzle(s) approved.')

    @admin.action(description='Archive selected puzzles')
    def archive_puzzles(self, request, queryset):
        count = queryset.update(status=ConnectionsPuzzle.Status.ARCHIVED)
        self.message_user(request, f'{count} puzzle(s) archived.')
