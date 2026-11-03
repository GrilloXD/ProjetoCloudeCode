import 'package:flutter/material.dart';

import '../../state/app_state.dart';
import '../theme.dart';

/// Carrega dados do banco e recarrega sempre que algo muda no app.
class Loader<T> extends StatefulWidget {
  const Loader({super.key, required this.load, required this.builder});

  final Future<T> Function(AppState app) load;
  final Widget Function(BuildContext context, T data) builder;

  @override
  State<Loader<T>> createState() => _LoaderState<T>();
}

class _LoaderState<T> extends State<Loader<T>> {
  Future<T>? _future;
  int _rev = -1;
  T? _last;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final app = AppScope.of(context);
    if (app.revision != _rev) {
      _rev = app.revision;
      _future = widget.load(app).then((v) => _last = v);
    }
  }

  void reload() {
    setState(() => _future = widget.load(AppScope.read(context)).then((v) => _last = v));
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<T>(
      future: _future,
      builder: (context, snap) {
        if (snap.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text('Erro ao carregar: ${snap.error}',
                  style: const TextStyle(color: AppColors.danger)),
            ),
          );
        }
        final data = snap.hasData ? snap.data as T : _last;
        if (data == null) {
          return const Center(child: CircularProgressIndicator(strokeWidth: 2));
        }
        return widget.builder(context, data);
      },
    );
  }
}
