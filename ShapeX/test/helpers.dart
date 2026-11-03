import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shape_x/data/database.dart';
import 'package:shape_x/data/models.dart';
import 'package:shape_x/data/repository.dart';
import 'package:shape_x/state/app_state.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';

void mockPlatform() {
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(SystemChannels.platform, (call) async => null);
}

Future<String> tempDbPath() async {
  final dir = await Directory.systemTemp.createTemp('shapex_test_');
  return '${dir.path}${Platform.pathSeparator}shape_x.db';
}

Future<AppState> openApp(String path, {DatabaseFactory? factory}) async {
  final db = await AppDatabase.open(path: path, factory: factory ?? databaseFactoryFfi);
  final app = AppState(Repository(db));
  await app.init();
  app.keepAwake = false;
  return app;
}

/// Grava uma sessão finalizada no passado, para popular histórico.
Future<void> seedSession(
  Repository repo,
  Routine r,
  DateTime at,
  Map<String, List<(double, int)>> sets,
) async {
  final id = await repo.startSession(r, at: at);
  final s = await repo.loadSession(id);
  for (final se in s.exercises) {
    final data = sets[se.exerciseId];
    if (data == null) continue;
    for (var i = 0; i < se.sets.length && i < data.length; i++) {
      final log = se.sets[i]
        ..weight = data[i].$1
        ..reps = data[i].$2
        ..done = true
        ..doneAt = at;
      await repo.saveSet(log);
    }
  }
  await repo.finishSession(id, at: at.add(const Duration(minutes: 62)));
}
