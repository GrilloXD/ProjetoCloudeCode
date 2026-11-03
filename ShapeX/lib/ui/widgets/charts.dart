import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../logic/formatters.dart';
import '../theme.dart';

class LinePoint {
  const LinePoint(this.x, this.y);
  final DateTime x;
  final double y;
}

class LineChart extends StatefulWidget {
  const LineChart({
    super.key,
    required this.points,
    this.overlay = const [],
    this.unit = 'kg',
    this.height = 180,
    this.color = AppColors.accent,
  });

  final List<LinePoint> points;
  final List<LinePoint> overlay;
  final String unit;
  final double height;
  final Color color;

  @override
  State<LineChart> createState() => _LineChartState();
}

class _LineChartState extends State<LineChart> {
  int? _sel;

  void _pick(Offset local, Size size) {
    final pts = widget.points;
    if (pts.isEmpty) return;
    final geo = _Geo(pts, widget.overlay, size);
    var best = 0;
    var bestD = double.infinity;
    for (var i = 0; i < pts.length; i++) {
      final d = (geo.px(pts[i].x) - local.dx).abs();
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setState(() => _sel = best);
  }

  @override
  Widget build(BuildContext context) {
    if (widget.points.isEmpty) {
      return SizedBox(
        height: widget.height,
        child: const Center(
          child: Text('Sem dados ainda', style: TextStyle(color: AppColors.textMute)),
        ),
      );
    }
    return SizedBox(
      height: widget.height,
      child: LayoutBuilder(builder: (context, c) {
        final size = Size(c.maxWidth, widget.height);
        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTapDown: (d) => _pick(d.localPosition, size),
          onHorizontalDragUpdate: (d) => _pick(d.localPosition, size),
          child: CustomPaint(
            size: size,
            painter: _LinePainter(widget.points, widget.overlay, widget.unit, widget.color, _sel),
          ),
        );
      }),
    );
  }
}

class _Geo {
  _Geo(this.pts, this.overlay, this.size) {
    final all = [...pts, ...overlay];
    var lo = all.map((p) => p.y).reduce(math.min);
    var hi = all.map((p) => p.y).reduce(math.max);
    if (hi - lo < 1e-6) {
      lo -= 1;
      hi += 1;
    }
    final pad = (hi - lo) * 0.12;
    minY = lo - pad;
    maxY = hi + pad;
    minX = all.map((p) => p.x.millisecondsSinceEpoch).reduce(math.min).toDouble();
    maxX = all.map((p) => p.x.millisecondsSinceEpoch).reduce(math.max).toDouble();
  }

  final List<LinePoint> pts;
  final List<LinePoint> overlay;
  final Size size;
  late final double minY, maxY, minX, maxX;

  static const left = 40.0;
  static const right = 10.0;
  static const top = 14.0;
  static const bottom = 22.0;

  double get w => size.width - left - right;
  double get h => size.height - top - bottom;

  double px(DateTime x) {
    if (maxX == minX) return left + w / 2;
    return left + (x.millisecondsSinceEpoch - minX) / (maxX - minX) * w;
  }

  double py(double y) => top + (1 - (y - minY) / (maxY - minY)) * h;
}

class _LinePainter extends CustomPainter {
  _LinePainter(this.pts, this.overlay, this.unit, this.color, this.sel);

  final List<LinePoint> pts;
  final List<LinePoint> overlay;
  final String unit;
  final Color color;
  final int? sel;

  void _text(Canvas c, String s, Offset at, {Color color = AppColors.textMute, double size = 10.5, TextAlign align = TextAlign.left, FontWeight weight = FontWeight.w500}) {
    final tp = TextPainter(
      text: TextSpan(
          text: s,
          style: TextStyle(color: color, fontSize: size, fontWeight: weight, fontFeatures: tabular)),
      textDirection: TextDirection.ltr,
    )..layout();
    var dx = at.dx;
    if (align == TextAlign.right) dx -= tp.width;
    if (align == TextAlign.center) dx -= tp.width / 2;
    tp.paint(c, Offset(dx, at.dy - tp.height / 2));
  }

  @override
  void paint(Canvas canvas, Size size) {
    final g = _Geo(pts, overlay, size);
    final grid = Paint()
      ..color = AppColors.border.withValues(alpha: 0.7)
      ..strokeWidth = 1;
    for (var i = 0; i <= 3; i++) {
      final y = g.minY + (g.maxY - g.minY) * i / 3;
      final yy = g.py(y);
      canvas.drawLine(Offset(_Geo.left, yy), Offset(size.width - _Geo.right, yy), grid);
      _text(canvas, fmtNum(y, maxDecimals: y.abs() < 20 ? 1 : 0), Offset(_Geo.left - 6, yy),
          align: TextAlign.right);
    }
    _text(canvas, fmtDate(pts.first.x), Offset(_Geo.left, size.height - 8));
    if (pts.length > 1) {
      _text(canvas, fmtDate(pts.last.x), Offset(size.width - _Geo.right, size.height - 8),
          align: TextAlign.right);
    }

    if (overlay.length > 1) {
      final o = Path();
      for (var i = 0; i < overlay.length; i++) {
        final p = Offset(g.px(overlay[i].x), g.py(overlay[i].y));
        i == 0 ? o.moveTo(p.dx, p.dy) : o.lineTo(p.dx, p.dy);
      }
      canvas.drawPath(
          o,
          Paint()
            ..color = AppColors.textDim.withValues(alpha: 0.55)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1.6);
    }

    final line = Path();
    for (var i = 0; i < pts.length; i++) {
      final p = Offset(g.px(pts[i].x), g.py(pts[i].y));
      i == 0 ? line.moveTo(p.dx, p.dy) : line.lineTo(p.dx, p.dy);
    }
    if (pts.length > 1) {
      final fill = Path.from(line)
        ..lineTo(g.px(pts.last.x), _Geo.top + g.h)
        ..lineTo(g.px(pts.first.x), _Geo.top + g.h)
        ..close();
      canvas.drawPath(
          fill,
          Paint()
            ..shader = LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [color.withValues(alpha: 0.28), color.withValues(alpha: 0.0)],
            ).createShader(Rect.fromLTWH(0, _Geo.top, size.width, g.h)));
      canvas.drawPath(
          line,
          Paint()
            ..color = color
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2.4
            ..strokeJoin = StrokeJoin.round
            ..strokeCap = StrokeCap.round);
    }
    final dot = Paint()..color = color;
    if (pts.length <= 40) {
      for (final p in pts) {
        canvas.drawCircle(Offset(g.px(p.x), g.py(p.y)), 2.8, dot);
      }
    }
    final s = sel;
    if (s != null && s < pts.length) {
      final p = pts[s];
      final o = Offset(g.px(p.x), g.py(p.y));
      canvas.drawLine(Offset(o.dx, _Geo.top), Offset(o.dx, _Geo.top + g.h),
          Paint()..color = AppColors.textDim.withValues(alpha: 0.5));
      canvas.drawCircle(o, 5.5, Paint()..color = AppColors.bg);
      canvas.drawCircle(o, 4.2, dot);
      final label = '${fmtNum(p.y, maxDecimals: 1)} $unit  ·  ${fmtDate(p.x)}';
      final tp = TextPainter(
        text: TextSpan(
            text: label,
            style: const TextStyle(
                color: AppColors.text, fontSize: 12, fontWeight: FontWeight.w700, fontFeatures: tabular)),
        textDirection: TextDirection.ltr,
      )..layout();
      final bw = tp.width + 16;
      var bx = o.dx - bw / 2;
      bx = bx.clamp(_Geo.left, size.width - _Geo.right - bw);
      final r = RRect.fromRectAndRadius(Rect.fromLTWH(bx, 0, bw, 22), const Radius.circular(8));
      canvas.drawRRect(r, Paint()..color = AppColors.cardHigh);
      tp.paint(canvas, Offset(bx + 8, 11 - tp.height / 2));
    }
  }

  @override
  bool shouldRepaint(_LinePainter old) =>
      old.pts != pts || old.overlay != overlay || old.sel != sel || old.color != color;
}

class BarDatum {
  const BarDatum(this.label, this.value, {this.highlight = false});
  final String label;
  final double value;
  final bool highlight;
}

class BarChart extends StatelessWidget {
  const BarChart({
    super.key,
    required this.data,
    this.height = 150,
    this.target,
    this.format,
  });

  final List<BarDatum> data;
  final double height;
  final double? target;
  final String Function(double)? format;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      child: CustomPaint(
        size: Size.infinite,
        painter: _BarPainter(data, target, format ?? (v) => fmtNum(v, maxDecimals: 0)),
      ),
    );
  }
}

class _BarPainter extends CustomPainter {
  _BarPainter(this.data, this.target, this.format);

  final List<BarDatum> data;
  final double? target;
  final String Function(double) format;

  @override
  void paint(Canvas canvas, Size size) {
    if (data.isEmpty) return;
    const top = 18.0;
    const bottom = 20.0;
    final h = size.height - top - bottom;
    final maxV = math.max(data.map((d) => d.value).reduce(math.max), target ?? 0);
    final scale = maxV <= 0 ? 0.0 : h / maxV;
    final slot = size.width / data.length;
    final bw = math.min(26.0, slot * 0.6);
    if (target != null && maxV > 0) {
      final y = top + h - target! * scale;
      final dash = Paint()
        ..color = AppColors.textDim.withValues(alpha: 0.6)
        ..strokeWidth = 1;
      for (var x = 0.0; x < size.width; x += 8) {
        canvas.drawLine(Offset(x, y), Offset(math.min(x + 4, size.width), y), dash);
      }
    }
    for (var i = 0; i < data.length; i++) {
      final d = data[i];
      final cx = slot * i + slot / 2;
      final bh = math.max(d.value * scale, d.value > 0 ? 3.0 : 0.0);
      final rect = RRect.fromRectAndCorners(
        Rect.fromLTWH(cx - bw / 2, top + h - bh, bw, bh),
        topLeft: const Radius.circular(6),
        topRight: const Radius.circular(6),
      );
      canvas.drawRRect(
          RRect.fromRectAndRadius(
              Rect.fromLTWH(cx - bw / 2, top, bw, h), const Radius.circular(6)),
          Paint()..color = AppColors.cardHigh.withValues(alpha: 0.6));
      canvas.drawRRect(
          rect,
          Paint()
            ..color = d.highlight ? AppColors.accent : AppColors.accent.withValues(alpha: 0.55));
      _label(canvas, d.label, Offset(cx, size.height - 8), AppColors.textMute, 10.5);
      if (d.value > 0) {
        _label(canvas, format(d.value), Offset(cx, top + h - bh - 9),
            d.highlight ? AppColors.text : AppColors.textDim, 10.5);
      }
    }
  }

  void _label(Canvas c, String s, Offset center, Color color, double size) {
    final tp = TextPainter(
      text: TextSpan(
          text: s,
          style: TextStyle(color: color, fontSize: size, fontWeight: FontWeight.w600, fontFeatures: tabular)),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(c, Offset(center.dx - tp.width / 2, center.dy - tp.height / 2));
  }

  @override
  bool shouldRepaint(_BarPainter old) => old.data != data || old.target != target;
}

class Sparkline extends StatelessWidget {
  const Sparkline(this.values, {super.key, this.height = 44, this.color = AppColors.accent});

  final List<double> values;
  final double height;
  final Color color;

  @override
  Widget build(BuildContext context) => SizedBox(
        height: height,
        child: CustomPaint(size: Size.infinite, painter: _SparkPainter(values, color)),
      );
}

class _SparkPainter extends CustomPainter {
  _SparkPainter(this.values, this.color);
  final List<double> values;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (values.length < 2) return;
    var lo = values.reduce(math.min);
    var hi = values.reduce(math.max);
    if (hi - lo < 1e-6) {
      lo -= 1;
      hi += 1;
    }
    final path = Path();
    for (var i = 0; i < values.length; i++) {
      final x = size.width * i / (values.length - 1);
      final y = 3 + (1 - (values[i] - lo) / (hi - lo)) * (size.height - 6);
      i == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
    }
    canvas.drawPath(
        path,
        Paint()
          ..color = color
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round);
  }

  @override
  bool shouldRepaint(_SparkPainter old) => old.values != values;
}
