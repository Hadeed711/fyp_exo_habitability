from django.conf import settings


class ContentSecurityPolicyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        content_type = response.get('Content-Type', '')
        if content_type.startswith('text/html') and getattr(settings, 'CONTENT_SECURITY_POLICY', None):
            response.setdefault('Content-Security-Policy', settings.CONTENT_SECURITY_POLICY)
        return response
