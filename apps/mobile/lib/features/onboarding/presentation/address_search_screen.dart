import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../../core/theme/app_theme.dart';

class AddressSearchScreen extends StatefulWidget {
  const AddressSearchScreen({super.key});

  @override
  State<AddressSearchScreen> createState() => _AddressSearchScreenState();
}

class _AddressSearchScreenState extends State<AddressSearchScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() => _isLoading = true);
          },
          onPageFinished: (String url) {
            setState(() => _isLoading = false);
          },
        ),
      )
      ..addJavaScriptChannel(
        'ToonAddressChannel',
        onMessageReceived: (JavaScriptMessage message) {
          try {
            final data = jsonDecode(message.message);
            final address = data['address'] as String;
            Navigator.pop(context, address);
          } catch (e) {
            debugPrint('주소 파싱 에러: $e');
          }
        },
      )
      ..loadHtmlString(_daumPostcodeHtml, baseUrl: 'https://daum.net');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          '주소 검색',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 16,
            fontWeight: FontWeight.w700,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
            color: AppColors.border.withOpacity(0.5),
            height: 1.0,
          ),
        ),
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
        ],
      ),
    );
  }

  static const String _daumPostcodeHtml = '''
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <style>
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; background-color: #ffffff; }
    #wrap { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="wrap"></div>
  <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
  <script>
    const element_wrap = document.getElementById('wrap');
    new daum.Postcode({
      oncomplete: function(data) {
        if (window.ToonAddressChannel) {
          window.ToonAddressChannel.postMessage(JSON.stringify({
            address: data.address,
            roadAddress: data.roadAddress,
            jibunAddress: data.jibunAddress,
            zonecode: data.zonecode
          }));
        }
      },
      onresize: function(size) {
        element_wrap.style.height = size.height + 'px';
      },
      width: '100%',
      height: '100%'
    }).embed(element_wrap);
  </script>
</body>
</html>
''';
}
