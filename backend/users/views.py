"""
Users Views — Auth + Saved Predictions
=======================================

POST /api/auth/register/          — Create account (returns JWT)
POST /api/auth/login/             — Login (returns JWT)
GET  /api/auth/me/                — Get current user profile  [auth required]
POST /api/auth/logout/            — Blacklist token / client-side only
GET  /api/auth/saved/             — List saved predictions    [auth required]
POST /api/auth/saved/             — Save a new prediction     [auth required]
DELETE /api/auth/saved/<id>/      — Delete saved prediction   [auth required]
"""

import logging
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile, SavedPrediction
from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserSerializer, SavedPredictionSerializer,
)

logger = logging.getLogger(__name__)


def _get_tokens(user):
    """Return access + refresh JWT tokens for the given user."""
    refresh = RefreshToken.for_user(user)
    return {
        'access':  str(refresh.access_token),
        'refresh': str(refresh),
    }


# ─── Auth Endpoints ───────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Create a new account and return JWT tokens."""
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    user = serializer.save()
    tokens = _get_tokens(user)
    return Response({
        'user':    UserSerializer(user).data,
        'tokens':  tokens,
        'message': 'Account created successfully.',
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Authenticate and return JWT tokens."""
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    username_or_email = serializer.validated_data['username']
    password          = serializer.validated_data['password']

    # Allow login by email OR username
    user = authenticate(username=username_or_email, password=password)
    if user is None:
        # Try finding by email
        try:
            db_user = User.objects.get(email__iexact=username_or_email)
            user = authenticate(username=db_user.username, password=password)
        except User.DoesNotExist:
            pass

    if user is None:
        return Response(
            {'error': 'Invalid credentials. Check your username/email and password.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.is_active:
        return Response(
            {'error': 'Account is disabled.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    tokens = _get_tokens(user)
    return Response({
        'user':   UserSerializer(user).data,
        'tokens': tokens,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """Return the currently authenticated user's profile."""
    return Response(UserSerializer(request.user).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Blacklist the refresh token (if SIMPLE_JWT ROTATE_REFRESH_TOKENS is on).
    Otherwise client just drops the token — this endpoint is a no-op signal.
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass   # Token may already be invalid; that's fine
    return Response({'message': 'Logged out.'})


# ─── Saved Predictions ────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def saved_predictions(request):
    """
    GET  — list all saved predictions for the authenticated user
    POST — save a new prediction
    """
    if request.method == 'GET':
        qs = SavedPrediction.objects.filter(user=request.user)
        return Response(SavedPredictionSerializer(qs, many=True).data)

    # POST — create
    serializer = SavedPredictionSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )
    prediction = serializer.save(user=request.user)
    return Response(
        SavedPredictionSerializer(prediction).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_saved_prediction(request, pk):
    """Delete a saved prediction belonging to the authenticated user."""
    try:
        prediction = SavedPrediction.objects.get(pk=pk, user=request.user)
    except SavedPrediction.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    prediction.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
