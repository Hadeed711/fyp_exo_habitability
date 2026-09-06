"""
Planet Data API Views
=====================

RESTful API endpoints for exoplanet data retrieval.
Implements Step 3.3 endpoints from the roadmap.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Avg, Count
from .models import Mission, Exoplanet
from .serializers import (
    MissionSerializer,
    ExoplanetListSerializer,
    ExoplanetDetailSerializer,
    ExoplanetSearchSerializer,
    PlanetStatsSerializer
)


class PlanetPagination(PageNumberPagination):
    """Custom pagination for planet lists."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


@api_view(['GET'])
def planet_list(request):
    """
    List all exoplanets with pagination.
    
    GET /api/planets/

    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Results per page (default: 50, max: 200)
    - mission: Filter by mission code (k2, kepler, tess)
    - habitability: Filter by habitability class
    - confirmed_only: true to exclude candidate-class objects
    - disposition: Exact archive disposition (CONFIRMED, CANDIDATE, PC, CP, KP, APC)
    - min_radius, max_radius: Radius range (Earth radii)
    - min_temp, max_temp: Temperature range (K)
    - q: Search by planet name
    - hide_incomplete: true to require both pl_eqt and pl_rade
    """
    queryset = Exoplanet.objects.select_related('mission').all()

    def numeric(name):
        """Parse a numeric filter, or raise ValueError naming the bad parameter.

        These were previously bare float() calls, so `?min_radius=abc` raised an
        unhandled ValueError and returned 500 where it should return 400.
        """
        raw = request.query_params.get(name)
        if raw in (None, ''):
            return None
        try:
            return float(raw)
        except (TypeError, ValueError):
            raise ValueError(name)

    try:
        min_radius = numeric('min_radius')
        max_radius = numeric('max_radius')
        min_temp = numeric('min_temp')
        max_temp = numeric('max_temp')
    except ValueError as exc:
        return Response(
            {'error': 'Invalid filter value',
             'detail': f"'{exc.args[0]}' must be a number."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    def flag(name):
        return request.query_params.get(name, '').lower() in ('true', '1', 'yes')

    # Apply filters
    mission = request.query_params.get('mission')
    if mission:
        queryset = queryset.filter(mission__name__iexact=mission)

    habitability = request.query_params.get('habitability')
    if habitability:
        queryset = queryset.filter(habitability_class__iexact=habitability)

    # Restrict to archive-confirmed planets, excluding candidate-class objects.
    # 81 of the 126 potentially-habitable objects are candidates, so this
    # materially changes what the page shows - which is the point of having it.
    if flag('confirmed_only'):
        queryset = queryset.filter(is_confirmed=True)

    disposition = request.query_params.get('disposition')
    if disposition:
        queryset = queryset.filter(disposition__iexact=disposition)

    if min_radius is not None:
        queryset = queryset.filter(pl_rade__gte=min_radius)
    if max_radius is not None:
        queryset = queryset.filter(pl_rade__lte=max_radius)
    if min_temp is not None:
        queryset = queryset.filter(pl_eqt__gte=min_temp)
    if max_temp is not None:
        queryset = queryset.filter(pl_eqt__lte=max_temp)

    search_query = request.query_params.get('q')
    if search_query:
        queryset = queryset.filter(planet_name__icontains=search_query)

    # Hide planets with incomplete key parameters (both pl_eqt and pl_rade null)
    if flag('hide_incomplete'):
        queryset = queryset.filter(pl_eqt__isnull=False, pl_rade__isnull=False)

    # Order by planet name
    queryset = queryset.order_by('planet_name')
    
    # Paginate
    paginator = PlanetPagination()
    page = paginator.paginate_queryset(queryset, request)
    
    if page is not None:
        serializer = ExoplanetListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = ExoplanetListSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def planet_detail(request, planet_id):
    """
    Get detailed information about a specific exoplanet.
    
    GET /api/planets/{id}/
    """
    try:
        planet = Exoplanet.objects.select_related('mission').get(id=planet_id)
    except Exoplanet.DoesNotExist:
        return Response(
            {'error': 'Planet not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = ExoplanetDetailSerializer(planet)
    return Response(serializer.data)


@api_view(['GET'])
def habitable_planets(request):
    """
    Get list of potentially habitable exoplanets.
    
    GET /api/planets/habitable/
    """
    queryset = Exoplanet.objects.select_related('mission').filter(
        habitability_class__in=['POTENTIALLY_HABITABLE', 'HABITABILITY_ZONE']
    ).order_by('-pl_eqt')  # Order by temperature (closer to Earth-like)
    
    paginator = PlanetPagination()
    page = paginator.paginate_queryset(queryset, request)
    
    if page is not None:
        serializer = ExoplanetListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
    
    serializer = ExoplanetListSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def planet_stats(request):
    """
    Get dataset statistics.
    
    GET /api/planets/stats/
    """
    total_planets = Exoplanet.objects.count()
    
    # Mission breakdown
    mission_stats = {}
    for mission in Mission.objects.all():
        planet_count = mission.planets.count()
        mission_stats[mission.name] = {
            'full_name': mission.full_name,
            'count': planet_count,
            'percentage': round((planet_count / total_planets * 100), 2) if total_planets > 0 else 0
        }
    
    # Habitability breakdown
    habitability_stats = {}
    hab_counts = Exoplanet.objects.values('habitability_class').annotate(count=Count('id'))
    for item in hab_counts:
        hab_class = item['habitability_class'] or 'Unknown'
        count = item['count']
        habitability_stats[hab_class] = {
            'count': count,
            'percentage': round((count / total_planets * 100), 2) if total_planets > 0 else 0
        }
    
    # Average values
    averages = Exoplanet.objects.aggregate(
        avg_radius=Avg('pl_rade'),
        avg_temp=Avg('pl_eqt'),
        avg_period=Avg('pl_orbper')
    )
    
    # Confirmed vs candidate provenance. Surfaced because a majority of the
    # potentially-habitable objects are candidate-class, and any headline
    # habitable count should be readable alongside that fact.
    confirmed_total = Exoplanet.objects.filter(is_confirmed=True).count()
    confirmed_habitable = Exoplanet.objects.filter(
        is_confirmed=True, habitability_class='POTENTIALLY_HABITABLE').count()
    all_habitable = Exoplanet.objects.filter(
        habitability_class='POTENTIALLY_HABITABLE').count()

    disposition_stats = {
        item['disposition'] or 'UNKNOWN': item['count']
        for item in Exoplanet.objects.values('disposition').annotate(count=Count('id'))
    }

    stats = {
        'total_planets': total_planets,
        'missions': mission_stats,
        'habitability_breakdown': habitability_stats,
        'provenance': {
            'confirmed': confirmed_total,
            'candidate': total_planets - confirmed_total,
            'confirmed_potentially_habitable': confirmed_habitable,
            'candidate_potentially_habitable': all_habitable - confirmed_habitable,
            'by_disposition': disposition_stats,
        },
        'avg_radius': round(averages['avg_radius'], 3) if averages['avg_radius'] else None,
        'avg_temperature': round(averages['avg_temp'], 2) if averages['avg_temp'] else None,
        'avg_orbital_period': round(averages['avg_period'], 2) if averages['avg_period'] else None
    }
    
    return Response(stats)


@api_view(['GET'])
def mission_list(request):
    """
    Get list of all missions.
    
    GET /api/missions/
    """
    missions = Mission.objects.all().order_by('name')
    serializer = MissionSerializer(missions, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def search_planets(request):
    """
    Search exoplanets by name or other criteria.
    
    GET /api/planets/search/?q={query}
    """
    search_query = request.query_params.get('q', '')
    
    if not search_query:
        return Response(
            {'error': 'Search query parameter "q" is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    queryset = Exoplanet.objects.select_related('mission').filter(
        Q(planet_name__icontains=search_query)
    ).order_by('planet_name')[:50]  # Limit to 50 results
    
    serializer = ExoplanetListSerializer(queryset, many=True)
    return Response({
        'query': search_query,
        'count': queryset.count(),
        'results': serializer.data
    })


@api_view(['GET'])
def compare_planets(request):
    """
    Compare multiple planets by their IDs.
    
    GET /api/planets/compare/?ids=1,2,3
    """
    ids_param = request.query_params.get('ids', '')
    
    if not ids_param:
        return Response(
            {'error': 'Planet IDs parameter "ids" is required (comma-separated)'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        planet_ids = [int(id.strip()) for id in ids_param.split(',')]
    except ValueError:
        return Response(
            {'error': 'Invalid planet IDs format. Use comma-separated integers.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(planet_ids) > 10:
        return Response(
            {'error': 'Maximum 10 planets can be compared at once'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    planets = Exoplanet.objects.select_related('mission').filter(id__in=planet_ids)
    
    if not planets.exists():
        return Response(
            {'error': 'No planets found with the provided IDs'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    serializer = ExoplanetDetailSerializer(planets, many=True)
    return Response({
        'count': planets.count(),
        'planets': serializer.data
    })

