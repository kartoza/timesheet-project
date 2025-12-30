import requests
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema


@extend_schema(exclude=True)
class RandomQuotes(APIView):

    def get(self, request):
        quote_api_url = 'https://zenquotes.io/api/random'
        quote_response = requests.get(quote_api_url)
        if quote_response.status_code == 200:
            return Response(quote_response.json())
        return Response([])
