// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geumumapp/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // ProviderScope로 감싸 GeumumApp 빌드 및 프레임 트리거
    await tester.pumpWidget(
      const ProviderScope(
        child: GeumumApp(),
      ),
    );

    // GeumumApp 인스턴스가 위젯 트리에 존재하는지 단순 확인
    expect(find.byType(GeumumApp), findsOneWidget);
  });
}
