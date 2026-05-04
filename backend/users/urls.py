from django.urls import path
from . import views

urlpatterns = [
    path('register/',          views.register,                  name='auth-register'),
    path('login/',             views.login,                     name='auth-login'),
    path('me/',                views.me,                        name='auth-me'),
    path('logout/',            views.logout,                    name='auth-logout'),
    path('saved/',             views.saved_predictions,          name='auth-saved'),
    path('saved/<int:pk>/',    views.delete_saved_prediction,   name='auth-saved-delete'),
]
