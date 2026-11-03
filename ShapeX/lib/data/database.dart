import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import 'seed/exercise_catalog.dart';
import 'seed/program_seed.dart';

class AppDatabase {
  AppDatabase._(this.db);

  final Database db;

  static const schemaVersion = 1;

  static Future<AppDatabase> open({String? path, DatabaseFactory? factory}) async {
    final f = factory ?? databaseFactory;
    final dbPath = path ?? p.join(await f.getDatabasesPath(), 'shape_x.db');
    final db = await f.openDatabase(
      dbPath,
      options: OpenDatabaseOptions(
        version: schemaVersion,
        onConfigure: (db) => db.execute('PRAGMA foreign_keys = ON'),
        onCreate: (db, version) async {
          await _createSchema(db);
          await _seedCatalog(db);
          await seedProgram(db);
        },
        onUpgrade: (db, oldV, newV) async {},
        onOpen: (db) async => _seedCatalog(db),
      ),
    );
    return AppDatabase._(db);
  }

  Future<void> close() => db.close();

  static Future<void> _createSchema(Database db) async {
    final b = db.batch();
    b.execute('''
      CREATE TABLE exercises(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        primary_muscle TEXT NOT NULL,
        secondary TEXT NOT NULL DEFAULT '',
        equipment TEXT NOT NULL,
        pattern TEXT NOT NULL,
        load_type TEXT NOT NULL DEFAULT 'weighted',
        unilateral INTEGER NOT NULL DEFAULT 0,
        increment REAL NOT NULL,
        instructions TEXT NOT NULL DEFAULT '',
        tip TEXT NOT NULL DEFAULT '',
        custom INTEGER NOT NULL DEFAULT 0
      )''');
    b.execute('''
      CREATE TABLE routines(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        focus TEXT NOT NULL DEFAULT '',
        weekday INTEGER,
        position INTEGER NOT NULL
      )''');
    b.execute('''
      CREATE TABLE routine_exercises(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        position INTEGER NOT NULL,
        sets INTEGER NOT NULL,
        rep_min INTEGER NOT NULL,
        rep_max INTEGER NOT NULL,
        rest_sec INTEGER NOT NULL,
        rir TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT ''
      )''');
    b.execute('''
      CREATE TABLE sessions(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id INTEGER,
        name TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER
      )''');
    b.execute('''
      CREATE TABLE session_exercises(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        position INTEGER NOT NULL,
        sets_planned INTEGER NOT NULL,
        rep_min INTEGER NOT NULL,
        rep_max INTEGER NOT NULL,
        rest_sec INTEGER NOT NULL,
        rir TEXT NOT NULL DEFAULT ''
      )''');
    b.execute('''
      CREATE TABLE set_logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_exercise_id INTEGER NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
        set_index INTEGER NOT NULL,
        weight REAL,
        reps INTEGER,
        done INTEGER NOT NULL DEFAULT 0,
        done_at INTEGER
      )''');
    b.execute('''
      CREATE TABLE body_weights(
        date TEXT PRIMARY KEY,
        weight REAL NOT NULL
      )''');
    b.execute('''
      CREATE TABLE substitutions(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        routine_id INTEGER NOT NULL,
        old_exercise_id TEXT NOT NULL,
        new_exercise_id TEXT NOT NULL,
        at INTEGER NOT NULL
      )''');
    b.execute('''
      CREATE TABLE settings(
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )''');
    b.execute('CREATE INDEX idx_se_exercise ON session_exercises(exercise_id)');
    b.execute('CREATE INDEX idx_se_session ON session_exercises(session_id)');
    b.execute('CREATE INDEX idx_sets_se ON set_logs(session_exercise_id)');
    b.execute('CREATE INDEX idx_sessions_started ON sessions(started_at)');
    b.execute('CREATE INDEX idx_re_routine ON routine_exercises(routine_id)');
    await b.commit(noResult: true);
  }

  static Future<void> _seedCatalog(Database db) async {
    final b = db.batch();
    for (final e in exerciseCatalog) {
      b.insert('exercises', e.toRow(), conflictAlgorithm: ConflictAlgorithm.ignore);
    }
    await b.commit(noResult: true);
  }

  static Future<void> seedProgram(DatabaseExecutor db) async {
    for (var i = 0; i < programSeed.length; i++) {
      final r = programSeed[i];
      final rid = await db.insert('routines', {
        'name': r.name,
        'focus': r.focus,
        'weekday': r.weekday,
        'position': i,
      });
      final b = db.batch();
      for (var j = 0; j < r.slots.length; j++) {
        final s = r.slots[j];
        b.insert('routine_exercises', {
          'routine_id': rid,
          'exercise_id': s.exerciseId,
          'position': j,
          'sets': s.sets,
          'rep_min': s.repMin,
          'rep_max': s.repMax,
          'rest_sec': s.restSec,
          'rir': s.rir,
          'note': s.note,
        });
      }
      await b.commit(noResult: true);
    }
  }
}
