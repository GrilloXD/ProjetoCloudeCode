import 'package:flutter/widgets.dart';

import '../data/models.dart';
import '../data/repository.dart';
import 'workout_controller.dart';

class AppState extends ChangeNotifier {
  AppState(this.repo);

  final Repository repo;
  Map<String, Exercise> exercises = {};
  WorkoutController? workout;
  bool keepAwake = true;
  bool vibrate = true;
  int revision = 0;

  Future<void> init() async {
    exercises = await repo.exerciseMap();
    keepAwake = (await repo.getSetting('keep_awake')) != '0';
    vibrate = (await repo.getSetting('vibrate')) != '0';
    final active = await repo.activeSession();
    if (active != null) {
      workout = await WorkoutController.load(this, active.id!);
    }
  }

  Future<void> refreshExercises() async {
    exercises = await repo.exerciseMap(refresh: true);
    changed();
  }

  void changed() {
    revision++;
    notifyListeners();
  }

  Future<WorkoutController> startWorkout(Routine r) async {
    final id = await repo.startSession(r);
    workout = await WorkoutController.load(this, id);
    changed();
    return workout!;
  }

  Future<WorkoutController> startEmptyWorkout() async {
    final id = await repo.startEmptySession('Treino livre');
    workout = await WorkoutController.load(this, id);
    changed();
    return workout!;
  }

  void clearWorkout() {
    workout?.stop();
    workout = null;
    changed();
  }

  Future<void> setKeepAwake(bool v) async {
    keepAwake = v;
    await repo.setSetting('keep_awake', v ? '1' : '0');
    changed();
  }

  Future<void> setVibrate(bool v) async {
    vibrate = v;
    await repo.setSetting('vibrate', v ? '1' : '0');
    changed();
  }
}

class AppScope extends InheritedNotifier<AppState> {
  const AppScope({super.key, required AppState state, required super.child})
      : super(notifier: state);

  static AppState of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AppScope>()!.notifier!;

  static AppState read(BuildContext context) =>
      context.getInheritedWidgetOfExactType<AppScope>()!.notifier!;
}
