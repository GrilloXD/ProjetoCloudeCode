import 'package:flutter/material.dart';

import '../../data/models.dart';
import '../../logic/analytics.dart';
import '../../logic/formatters.dart';
import '../../logic/progression.dart';
import '../theme.dart';

class XCard extends StatelessWidget {
  const XCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
    this.color = AppColors.card,
    this.margin,
    this.borderColor,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final Color color;
  final EdgeInsetsGeometry? margin;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: margin ?? EdgeInsets.zero,
      child: Material(
        color: color,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: borderColor == null ? BorderSide.none : BorderSide(color: borderColor!),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader(this.title, {super.key, this.trailing, this.padding});

  final String title;
  final Widget? trailing;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? const EdgeInsets.fromLTRB(4, 22, 4, 10),
      child: Row(
        children: [
          Expanded(
            child: Text(
              title.toUpperCase(),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.1,
                color: AppColors.textDim,
              ),
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

class Pill extends StatelessWidget {
  const Pill(this.text, {super.key, this.color = AppColors.textDim, this.filled = false, this.icon});

  final String text;
  final Color color;
  final bool filled;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: filled ? color.withValues(alpha: 0.16) : AppColors.cardHigh,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 4),
          ],
          Text(text,
              style: TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w700, color: filled ? color : AppColors.textDim)),
        ],
      ),
    );
  }
}

class StatTile extends StatelessWidget {
  const StatTile({super.key, required this.label, required this.value, this.unit});

  final String label;
  final String value;
  final String? unit;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textDim, fontWeight: FontWeight.w600)),
        const SizedBox(height: 4),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Flexible(
              child: Text(value,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 22, fontWeight: FontWeight.w800, fontFeatures: tabular, letterSpacing: -0.5)),
            ),
            if (unit != null) ...[
              const SizedBox(width: 3),
              Text(unit!, style: const TextStyle(fontSize: 13, color: AppColors.textDim, fontWeight: FontWeight.w600)),
            ],
          ],
        ),
      ],
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key, required this.icon, required this.title, this.text});

  final IconData icon;
  final String title;
  final String? text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 36, horizontal: 24),
      child: Column(
        children: [
          Icon(icon, size: 40, color: AppColors.textMute),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700), textAlign: TextAlign.center),
          if (text != null) ...[
            const SizedBox(height: 6),
            Text(text!, style: const TextStyle(color: AppColors.textDim), textAlign: TextAlign.center),
          ],
        ],
      ),
    );
  }
}

class RecBanner extends StatelessWidget {
  const RecBanner(this.rec, {super.key, this.onApply, this.applied = false, this.compact = false});

  final Recommendation rec;
  final VoidCallback? onApply;
  final bool applied;
  final bool compact;

  static Color colorFor(RecKind k) => switch (k) {
        RecKind.increase => AppColors.accent,
        RecKind.reduce => AppColors.warn,
        RecKind.below => AppColors.warn,
        RecKind.keep => AppColors.info,
        RecKind.start => AppColors.textDim,
      };

  static IconData iconFor(RecKind k) => switch (k) {
        RecKind.increase => Icons.trending_up_rounded,
        RecKind.reduce => Icons.trending_down_rounded,
        RecKind.below => Icons.flag_outlined,
        RecKind.keep => Icons.add_circle_outline_rounded,
        RecKind.start => Icons.tune_rounded,
      };

  @override
  Widget build(BuildContext context) {
    final c = colorFor(rec.kind);
    return Container(
      padding: EdgeInsets.fromLTRB(12, compact ? 8 : 10, onApply != null ? 6 : 12, compact ? 8 : 10),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(iconFor(rec.kind), size: 18, color: c),
          const SizedBox(width: 8),
          Expanded(
            child: Text(rec.title,
                style: TextStyle(color: c, fontWeight: FontWeight.w700, fontSize: compact ? 12.5 : 13.5)),
          ),
          if (onApply != null)
            TextButton(
              onPressed: onApply,
              style: TextButton.styleFrom(
                foregroundColor: c,
                visualDensity: VisualDensity.compact,
                padding: const EdgeInsets.symmetric(horizontal: 10),
              ),
              child: Text(applied ? 'Desfazer' : 'Aplicar'),
            ),
        ],
      ),
    );
  }
}

class InsightTile extends StatelessWidget {
  const InsightTile(this.insight, {super.key});

  final Insight insight;

  @override
  Widget build(BuildContext context) {
    final (color, icon) = switch (insight.level) {
      InsightLevel.good => (AppColors.accent, Icons.check_circle_outline_rounded),
      InsightLevel.info => (AppColors.info, Icons.info_outline_rounded),
      InsightLevel.warn => (AppColors.warn, Icons.warning_amber_rounded),
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(insight.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(insight.detail, style: const TextStyle(color: AppColors.textDim, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class VolumeBar extends StatelessWidget {
  const VolumeBar({super.key, required this.muscle, required this.done, required this.planned});

  final Muscle muscle;
  final double done;
  final double planned;

  @override
  Widget build(BuildContext context) {
    final ratio = planned <= 0 ? (done > 0 ? 1.0 : 0.0) : (done / planned).clamp(0.0, 1.0);
    final over = planned > 0 && done > planned * 1.3;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          SizedBox(
            width: 118,
            child: Text(muscle.label,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Stack(
                children: [
                  Container(height: 8, color: AppColors.cardHigh),
                  FractionallySizedBox(
                    widthFactor: ratio,
                    child: Container(height: 8, color: over ? AppColors.warn : AppColors.accent),
                  ),
                ],
              ),
            ),
          ),
          SizedBox(
            width: 64,
            child: Text(
              '${setsLabel(done)} / ${setsLabel(planned)}',
              textAlign: TextAlign.right,
              style: const TextStyle(
                  fontSize: 12.5, color: AppColors.textDim, fontWeight: FontWeight.w700, fontFeatures: tabular),
            ),
          ),
        ],
      ),
    );
  }
}

String repsRange(int a, int b) => a == b ? '$a' : '$a-$b';

String slotSummary(int sets, int repMin, int repMax, bool unilateral) =>
    '$sets × ${repsRange(repMin, repMax)}${unilateral ? ' cada lado' : ''}';

Future<bool> confirm(BuildContext context, String title, String text,
    {String ok = 'Confirmar', bool danger = false}) async {
  final r = await showDialog<bool>(
    context: context,
    builder: (c) => AlertDialog(
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
      content: Text(text, style: const TextStyle(color: AppColors.textDim)),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(c, false),
          style: TextButton.styleFrom(foregroundColor: AppColors.textDim),
          child: const Text('Cancelar'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(c, true),
          style: TextButton.styleFrom(foregroundColor: danger ? AppColors.danger : AppColors.accent),
          child: Text(ok),
        ),
      ],
    ),
  );
  return r ?? false;
}

void toast(BuildContext context, String msg) {
  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(msg), duration: const Duration(seconds: 2)));
}

String restLabel(int sec) => fmtClock(sec);
