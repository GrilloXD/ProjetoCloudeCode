import 'dart:math' as math;
import 'dart:typed_data';

import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../theme.dart';

/// Ilustração anatômica vetorial (frente e costas) desenhada localmente.
/// Coordenadas de cada figura em 100 x 200, metade esquerda espelhada.

enum MapView { both, front, back, focus }

class _Region {
  const _Region(this.muscle, this.d);
  final Muscle? muscle;
  final String d;
}

const _silhouette = [
  'M50,29 L43,29.5 Q36,30.5 30,31 Q22,32 20,40 L19.5,48 L28,52 L31,56 Q33,62 34,72 Q34.5,80 33,88 Q31,94 31,98 L50,100 Z',
  'M20,40 Q17.5,52 18.5,62 Q19,68 21,71 L27.5,70.5 Q29.5,62 29.5,54 L28.5,45 Z',
  'M21.5,69 Q16.5,77 15.8,87 Q15.5,94 16.8,98.5 L22.2,99 Q25.2,90 26.8,80 Q27.8,74 27.3,69 Z',
  'M16.5,98 Q14.5,103 16.2,108 Q19.5,111 22.5,107 Q23.5,102 22.3,98 Z',
  'M31,95 Q29.2,108 29.8,122 Q30.8,136 34.3,147 L46.8,147 Q48.8,132 49.6,116 L50,99 Z',
  'M34.3,144 L46.8,144 Q47.6,150 46.4,154 L35,154 Q33.8,149 34.3,144 Z',
  'M35,152 Q32.3,162 33.3,172 Q34.8,182 36.8,188.5 L42.8,188.5 Q44.8,176 45.2,166 Q45.6,158 46.3,152 Z',
  'M36.8,187 L43,187 Q44.2,192 43.6,196.5 L33.8,196.5 Q33.6,191.5 36.8,187 Z',
  'M44.5,20 L50,20 L50,31 L43.5,31 Z',
];

const _front = [
  _Region(Muscle.trapezio, 'M44.2,26.5 Q38.5,29.5 31.5,31.5 L36.5,33.6 L44.2,31.8 Z'),
  _Region(Muscle.deltoideLateral,
      'M30.5,31.2 Q22.3,32 20.1,40 Q19.5,45 21,48.6 L24.2,49.6 Q23.2,41 30.5,31.2 Z'),
  _Region(Muscle.deltoideAnterior,
      'M30.5,31.2 Q23.2,41 24.2,49.6 Q27.3,47 29.2,43 Q32,37.2 37,34 Q34.2,31.6 30.5,31.2 Z'),
  _Region(Muscle.peito,
      'M49.6,34 L37.8,34.2 Q32.2,37.3 30.2,42.7 Q29.3,48.3 31.8,52.6 Q36.3,57 43.2,57.2 Q47.2,57.1 49.6,55.6 Z'),
  _Region(Muscle.biceps,
      'M23.6,50.8 Q20,55.3 19.6,61.2 Q19.6,66.3 22.1,69.2 L26.7,68.7 Q28.7,63.2 28.6,57.2 Q28.1,52.2 26.1,49.8 Z'),
  _Region(Muscle.antebraco,
      'M21.7,70.6 Q17.6,77.2 16.6,85.2 Q16.1,92 17.6,97.2 L21.7,97.6 Q24.2,90.2 25.7,82.2 Q26.7,76 26.7,70.4 Z'),
  _Region(Muscle.abdomen,
      'M49.6,59 L44.2,59.6 Q42.7,70 43.1,80 Q43.6,88 45.1,93 L49.6,94.2 Z'),
  _Region(Muscle.abdomen,
      'M42.4,59.7 Q36.4,58.7 33.2,60.2 Q33.6,70 34.6,78 Q36.1,86 39.1,91.2 L44.2,93.2 Q41.9,85 41.9,77 Q41.7,68 42.4,59.7 Z'),
  _Region(Muscle.quadriceps,
      'M32.2,98.6 Q30.6,110 31.1,122 Q32.1,135 35.6,144.4 L40,144.8 Q38,134 38.5,122 Q39.5,108 41.2,99.6 Z'),
  _Region(Muscle.quadriceps,
      'M41.8,100 Q40.2,110 40.2,122 Q40.6,134 41.6,144.8 L46.2,144.8 Q48.1,133 48.4,119 Q48.3,108 46.4,101.3 Z'),
  _Region(Muscle.adutores, 'M46.9,101.4 L49.7,100.3 L49.7,121 Q49,109 46.9,101.4 Z'),
  _Region(null,
      'M36.2,155 Q34.2,163 35.1,172 Q36.1,180 37.6,186 L40.6,186 Q40.2,175 40.6,163 Q41,157 40.6,155 Z'),
  _Region(Muscle.panturrilha,
      'M41.8,155 Q45.4,160.5 45,168 Q44.6,175 43.1,181 L41.3,181 Q42.6,170 41.6,160 Z'),
];

const _back = [
  _Region(Muscle.trapezio,
      'M50,21.5 L45.2,23.5 Q41,28.5 32.8,31.6 Q40,34.2 44.6,40.4 Q47.6,46.4 50,52.6 Z'),
  _Region(Muscle.deltoideLateral,
      'M31,31.5 Q22.3,32 20.1,40 Q19.5,45 21,48.6 L24.2,49.6 Q23.2,41 31,31.5 Z'),
  _Region(Muscle.deltoidePosterior,
      'M31,31.5 Q23.2,41 24.2,49.6 Q27.6,46.4 30.1,42.2 Q32.6,38 36.4,35.6 Q34.1,32.6 31,31.5 Z'),
  _Region(Muscle.costas,
      'M44.4,41 Q41,36.4 37,36.2 Q33.1,38.8 31.1,43.2 Q30.6,47.2 31.4,50.2 Q37.2,49.2 42.2,51.6 Q44.6,46.6 44.4,41 Z'),
  _Region(Muscle.costas,
      'M31.4,51.3 Q37.1,50.3 42.6,53.2 Q46.1,56.4 47.4,62 L47.8,70 Q44,76.2 40.2,82 Q37.1,78 35.6,72 Q33.1,62 31.4,51.3 Z'),
  _Region(Muscle.lombar,
      'M49.7,55 L49.7,91.6 L44.6,91.6 Q42.6,88 41.6,84 Q45.6,78 48.1,71.4 Q48.6,62 49.7,55 Z'),
  _Region(Muscle.triceps,
      'M23.6,50.8 Q20,55.3 19.6,61.2 Q19.6,66.3 22.1,69.4 L27,69 Q29,63.2 28.8,57.2 Q28.3,52.2 26.1,49.8 Z'),
  _Region(Muscle.antebraco,
      'M21.7,70.6 Q17.6,77.2 16.6,85.2 Q16.1,92 17.6,97.2 L21.7,97.6 Q24.2,90.2 25.7,82.2 Q26.7,76 26.7,70.4 Z'),
  _Region(Muscle.gluteos,
      'M49.7,92.4 Q42,91.2 36.2,94.2 Q32.2,98 31.7,104 Q32.2,110.6 36.2,113.4 Q43,115.8 49.7,113.4 Z'),
  _Region(Muscle.posteriores,
      'M32.6,115 Q31,125 32,135 Q33.6,142.4 35.6,147 L41,147 Q41.6,135 41.6,124 Q41.6,118.6 40,116 Z'),
  _Region(Muscle.posteriores,
      'M41.7,116.4 Q42.7,124 42.6,134 Q42.6,141 42.1,147 L46.6,147 Q48.6,136 49,124 Q49,118.4 47.6,115 Z'),
  _Region(Muscle.panturrilha,
      'M34.6,154 Q32.6,161 33.1,168 Q34.1,175 37.6,179 L40.6,179 Q40.6,169 40.1,161 Q39.6,156 38.1,154 Z'),
  _Region(Muscle.panturrilha,
      'M41,154 Q43.6,156 45.1,161 Q45.6,169 43.6,177 L41.6,179 Q41.9,169 41.3,161 Z'),
];

const _frontMuscles = {
  Muscle.peito, Muscle.deltoideAnterior, Muscle.biceps, Muscle.quadriceps,
  Muscle.abdomen, Muscle.adutores, Muscle.deltoideLateral, Muscle.antebraco,
};

final Map<String, Path> _pathCache = {};

Path _parse(String d) {
  final cached = _pathCache[d];
  if (cached != null) return cached;
  final path = Path();
  final tokens = RegExp(r'[MLQCZ]|-?\d*\.?\d+').allMatches(d).map((m) => m.group(0)!).toList();
  var i = 0;
  String cmd = 'M';
  double n() => double.parse(tokens[i++]);
  while (i < tokens.length) {
    final t = tokens[i];
    if (RegExp(r'^[MLQCZ]$').hasMatch(t)) {
      cmd = t;
      i++;
      if (cmd == 'Z') {
        path.close();
        continue;
      }
    }
    switch (cmd) {
      case 'M':
        path.moveTo(n(), n());
        cmd = 'L';
      case 'L':
        path.lineTo(n(), n());
      case 'Q':
        path.quadraticBezierTo(n(), n(), n(), n());
      case 'C':
        path.cubicTo(n(), n(), n(), n(), n(), n());
      default:
        i++;
    }
  }
  _pathCache[d] = path;
  return path;
}

final _mirror = Float64List.fromList([-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 100, 0, 0, 1]);

Iterable<Path> _both(String d, bool mirror) sync* {
  final p = _parse(d);
  yield p;
  if (mirror) yield p.transform(_mirror);
}

class MuscleMap extends StatelessWidget {
  const MuscleMap({
    super.key,
    required this.primary,
    this.secondary = const {},
    this.view = MapView.both,
    this.highlight = AppColors.accent,
  });

  factory MuscleMap.forExercise(Exercise e, {MapView view = MapView.both}) => MuscleMap(
        primary: {e.primary},
        secondary: e.secondary.toSet(),
        view: view,
      );

  final Set<Muscle> primary;
  final Set<Muscle> secondary;
  final MapView view;
  final Color highlight;

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: CustomPaint(
        painter: _MuscleMapPainter(primary, secondary, view, highlight),
        size: Size.infinite,
      ),
    );
  }
}

class _MuscleMapPainter extends CustomPainter {
  _MuscleMapPainter(this.primary, this.secondary, this.view, this.highlight);

  final Set<Muscle> primary;
  final Set<Muscle> secondary;
  final MapView view;
  final Color highlight;

  bool get _focusFront => primary.any(_frontMuscles.contains);

  Color _colorFor(Muscle? m) {
    if (m != null && primary.contains(m)) return highlight;
    if (m != null && secondary.contains(m)) return highlight.withValues(alpha: 0.38);
    return AppColors.bodyBase;
  }

  void _drawFigure(Canvas canvas, List<_Region> regions) {
    final sil = Paint()..color = AppColors.bodyShade;
    for (final d in _silhouette) {
      for (final p in _both(d, true)) {
        canvas.drawPath(p, sil);
      }
    }
    canvas.drawOval(Rect.fromCenter(center: const Offset(50, 11.5), width: 15, height: 19), sil);
    final gap = Paint()
      ..color = AppColors.bodyShade
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.9
      ..strokeJoin = StrokeJoin.round;
    for (final r in regions) {
      final fill = Paint()..color = _colorFor(r.muscle);
      for (final p in _both(r.d, true)) {
        canvas.drawPath(p, fill);
        canvas.drawPath(p, gap);
      }
    }
  }

  Rect _focusRect(List<_Region> regions) {
    Rect? box;
    for (final r in regions) {
      if (r.muscle == null || !primary.contains(r.muscle)) continue;
      for (final p in _both(r.d, true)) {
        final b = p.getBounds();
        box = box == null ? b : box.expandToInclude(b);
      }
    }
    box ??= const Rect.fromLTWH(0, 0, 100, 200);
    final side = math.max(box.width, box.height) + 22;
    return Rect.fromCenter(center: box.center, width: side, height: side);
  }

  @override
  void paint(Canvas canvas, Size size) {
    if (view == MapView.focus) {
      final regions = _focusFront ? _front : _back;
      final rect = _focusRect(regions);
      final s = math.min(size.width / rect.width, size.height / rect.height);
      canvas.save();
      canvas.clipRect(Offset.zero & size);
      canvas.translate(size.width / 2, size.height / 2);
      canvas.scale(s);
      canvas.translate(-rect.center.dx, -rect.center.dy);
      _drawFigure(canvas, regions);
      canvas.restore();
      return;
    }
    final figures = switch (view) {
      MapView.front => [_front],
      MapView.back => [_back],
      _ => [_front, _back],
    };
    final w = 100.0 * figures.length;
    const h = 200.0;
    final s = math.min(size.width / w, size.height / h);
    final dx = (size.width - w * s) / 2;
    final dy = (size.height - h * s) / 2;
    for (var i = 0; i < figures.length; i++) {
      canvas.save();
      canvas.translate(dx + i * 100 * s, dy);
      canvas.scale(s);
      _drawFigure(canvas, figures[i]);
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_MuscleMapPainter old) =>
      old.view != view ||
      old.highlight != highlight ||
      !_setEq(old.primary, primary) ||
      !_setEq(old.secondary, secondary);

  static bool _setEq(Set<Muscle> a, Set<Muscle> b) => a.length == b.length && a.containsAll(b);
}

class ExerciseThumb extends StatelessWidget {
  const ExerciseThumb(this.exercise, {super.key, this.size = 52});

  final Exercise? exercise;
  final double size;

  @override
  Widget build(BuildContext context) {
    final e = exercise;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: AppColors.cardHigh,
        borderRadius: BorderRadius.circular(size * 0.26),
      ),
      clipBehavior: Clip.antiAlias,
      child: e == null
          ? const Icon(Icons.fitness_center, color: AppColors.textMute)
          : Stack(
              children: [
                Positioned.fill(
                  child: Padding(
                    padding: EdgeInsets.all(size * 0.06),
                    child: MuscleMap.forExercise(e, view: MapView.focus),
                  ),
                ),
                Positioned(
                  right: 0,
                  bottom: 0,
                  child: Container(
                    width: size * 0.38,
                    height: size * 0.38,
                    decoration: BoxDecoration(
                      color: AppColors.bg.withValues(alpha: 0.82),
                      borderRadius: BorderRadius.only(topLeft: Radius.circular(size * 0.14)),
                    ),
                    child: Icon(equipmentIcon(e.equipment), size: size * 0.24, color: AppColors.textDim),
                  ),
                ),
              ],
            ),
    );
  }
}

IconData equipmentIcon(Equipment e) => switch (e) {
      Equipment.maquina => Icons.settings_outlined,
      Equipment.polia => Icons.cable_rounded,
      Equipment.halteres => Icons.fitness_center_rounded,
      Equipment.barra => Icons.horizontal_rule_rounded,
      Equipment.smith => Icons.view_week_outlined,
      Equipment.pesoCorporal => Icons.accessibility_new_rounded,
    };
