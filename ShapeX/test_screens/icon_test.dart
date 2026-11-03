// Gera o ícone base em 1024 px:
// flutter test test_screens/icon_test.dart --update-goldens
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shape_x/ui/theme.dart';

class _IconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width;
    canvas.drawRect(Offset.zero & size, Paint()..color = AppColors.bg);
    canvas.drawCircle(
      Offset(s / 2, s / 2),
      s * 0.46,
      Paint()
        ..shader = RadialGradient(
          colors: [AppColors.accent.withValues(alpha: 0.16), AppColors.accent.withValues(alpha: 0.0)],
        ).createShader(Rect.fromCircle(center: Offset(s / 2, s / 2), radius: s * 0.46)),
    );
    final bar = Paint()
      ..color = AppColors.accent
      ..strokeWidth = s * 0.13
      ..strokeCap = StrokeCap.round;
    final m = s * 0.29;
    final top = s * 0.27;
    final bottom = s * 0.73;
    canvas.drawLine(Offset(m, top), Offset(s - m, bottom), bar);
    canvas.drawLine(Offset(s - m, top), Offset(m, bottom), bar);
  }

  @override
  bool shouldRepaint(_IconPainter old) => false;
}

void main() {
  testWidgets('ícone', (tester) async {
    tester.view.physicalSize = const Size(1024, 1024);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      RepaintBoundary(
        key: const Key('icon'),
        child: CustomPaint(painter: _IconPainter(), size: const Size(1024, 1024)),
      ),
    );
    await expectLater(find.byKey(const Key('icon')), matchesGoldenFile('shots/icon_1024.png'));
  });
}
