from django.forms import ModelForm, PasswordInput
from timesheet.models.profile import Profile


class ProfileForm(ModelForm):
    class Meta:
        model = Profile
        # widgets = {
        #     'api_secret': PasswordInput(
        #         render_value=True
        #     )
        # }
        fields = '__all__'
