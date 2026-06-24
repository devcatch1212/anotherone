/// 카카오맵 관련 유틸리티
///
/// API 키와 맵 HTML 템플릿을 한 곳에서 관리합니다.
/// [중요] API 키는 반드시 Kakao Developers 콘솔에서 도메인 제한 설정 후 사용하세요.
/// 추후 환경변수(.env) 또는 백엔드 반환 방식으로 마이그레이션을 권장합니다.
abstract class KakaoMapUtils {
  /// Kakao JavaScript SDK App Key
  static const String _appKey = 'b266405199d6c10bc598d2d53a52bce2';

  /// 기본 baseUrl (WebView loadHtmlString에 사용)
  static const String baseUrl = 'https://anotherone-tjgi.onrender.com';

  /// 드래그 가능한 마커가 포함된 카카오맵 HTML 문자열을 반환합니다.
  ///
  /// 마커를 드래그하거나 주소 검색 성공 시 `ToonMapChannel`을 통해
  /// `{ lat: number, lng: number }` JSON을 Flutter로 전달합니다.
  static String get mapHtml => '''
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <style>
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; }
    #map { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=$_appKey&libraries=services"></script>
  <script>
    let map, marker, geocoder;

    function initMap(lat, lng) {
      const container = document.getElementById('map');
      const options = {
        center: new kakao.maps.LatLng(lat, lng),
        level: 3
      };
      map = new kakao.maps.Map(container, options);

      const markerPosition = new kakao.maps.LatLng(lat, lng);
      marker = new kakao.maps.Marker({
        position: markerPosition,
        draggable: true
      });
      marker.setMap(map);

      // 드래그 종료 이벤트
      kakao.maps.event.addListener(marker, 'dragend', function() {
        const latlng = marker.getPosition();
        if (window.ToonMapChannel) {
          window.ToonMapChannel.postMessage(JSON.stringify({
            lat: latlng.getLat(),
            lng: latlng.getLng()
          }));
        }
      });
    }

    function searchAddress(address) {
      if (!geocoder) {
        geocoder = new kakao.maps.services.Geocoder();
      }
      geocoder.addressSearch(address, function(result, status) {
        if (status === kakao.maps.services.Status.OK && result[0]) {
          const lat = parseFloat(result[0].y);
          const lng = parseFloat(result[0].x);
          const moveLatLng = new kakao.maps.LatLng(lat, lng);

          if (!map) {
            initMap(lat, lng);
          } else {
            map.setCenter(moveLatLng);
            marker.setPosition(moveLatLng);
          }

          if (window.ToonMapChannel) {
            window.ToonMapChannel.postMessage(JSON.stringify({
              lat: lat,
              lng: lng
            }));
          }
        } else {
          // 좌표가 없거나 로드 전이면 서울 기준 기본 맵 초기화
          if (!map) {
            initMap(37.566826, 126.9786567);
          }
        }
      });
    }
  </script>
</body>
</html>
''';
}
