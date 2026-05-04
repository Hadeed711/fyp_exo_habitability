from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin as DefaultUserAdmin
from .models import UserProfile, SavedPrediction


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = "Profile"
    readonly_fields = ("avatar_preview",)
    fields = ("avatar_preview",)

    def avatar_preview(self, obj):
        from django.utils.html import format_html
        if obj.profile_image:
            return format_html('<img src="{}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;" />', obj.profile_image)
        return "No image uploaded"
    avatar_preview.short_description = "Profile Image"


class UserAdmin(DefaultUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ("username", "email", "first_name", "last_name", "is_staff", "date_joined")
    search_fields = ("username", "email")


@admin.register(SavedPrediction)
class SavedPredictionAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "created_at")
    list_filter = ("user",)
    search_fields = ("user__username", "name")
    readonly_fields = ("created_at", "inputs", "outputs")
    ordering = ("-created_at",)


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
