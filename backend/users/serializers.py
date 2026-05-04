"""
Users Serializers
=================
"""

from django.contrib.auth.models import User
from rest_framework import serializers
from .models import UserProfile, SavedPrediction


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=3, max_length=50)
    email    = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    profile_image = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        profile_image = validated_data.pop('profile_image', '')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        UserProfile.objects.create(user=user, profile_image=profile_image)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()   # accepts username or email
    password = serializers.CharField(write_only=True)


class UserSerializer(serializers.ModelSerializer):
    profile_image = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'profile_image', 'date_joined']

    def get_profile_image(self, obj):
        try:
            return obj.profile.profile_image or ''
        except UserProfile.DoesNotExist:
            return ''


class SavedPredictionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SavedPrediction
        fields = ['id', 'name', 'inputs', 'outputs', 'created_at']
        read_only_fields = ['id', 'created_at']
