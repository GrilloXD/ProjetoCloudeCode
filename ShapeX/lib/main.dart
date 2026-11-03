import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app.dart';
import 'data/database.dart';
import 'data/repository.dart';
import 'state/app_state.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  final db = await AppDatabase.open();
  final state = AppState(Repository(db));
  await state.init();
  runApp(ShapeXApp(state: state));
}
