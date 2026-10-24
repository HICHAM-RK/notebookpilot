import {
  ExperimentTemplateError,
  generateTrainingCell,
  validateExperimentSelection,
} from "../src/experiments/templates";

const base = {
  datasetHash: "a".repeat(64),
  fileName: "notebookpilot-fixture.csv",
  target: "target",
  features: ["age", "income", "segment"],
  model: "logistic_regression" as const,
};

test("requires an explicit distinct target and bounded unique features", () => {
  expect(() => validateExperimentSelection({ ...base, target: "" })).toThrow(
    new ExperimentTemplateError("INVALID_SELECTION"),
  );
  expect(() => validateExperimentSelection({ ...base, features: [] })).toThrow(
    new ExperimentTemplateError("INVALID_SELECTION"),
  );
  expect(() =>
    validateExperimentSelection({ ...base, features: ["target"] }),
  ).toThrow(new ExperimentTemplateError("INVALID_SELECTION"));
  expect(() =>
    validateExperimentSelection({ ...base, features: ["age", "age"] }),
  ).toThrow(new ExperimentTemplateError("INVALID_SELECTION"));
});

test("rejects caller-controlled paths and unknown model settings", () => {
  expect(() =>
    generateTrainingCell({ ...base, fileName: "../private.csv" }),
  ).toThrow(new ExperimentTemplateError("INVALID_SELECTION"));
  expect(() =>
    generateTrainingCell({ ...base, model: "xgboost" as never }),
  ).toThrow(new ExperimentTemplateError("INVALID_SELECTION"));
  expect(() =>
    generateTrainingCell({ ...base, datasetHash: "not-a-hash" }),
  ).toThrow(new ExperimentTemplateError("INVALID_SELECTION"));
});

test.each([
  [
    "logistic_regression",
    "LogisticRegression(max_iter=1000, random_state=SEED)",
  ],
  [
    "random_forest",
    "RandomForestClassifier(n_estimators=100, random_state=SEED, n_jobs=1)",
  ],
] as const)("generates the fixed %s pipeline", (model, constructor) => {
  const source = generateTrainingCell({ ...base, model });
  expect(source).toContain("SEED = 42");
  expect(source).toContain("TEST_FRACTION = 0.2");
  expect(source).toContain("train_test_split(");
  expect(source).toContain("stratify=y");
  expect(source).toContain(constructor);
  expect(source).toContain("SimpleImputer(strategy='median')");
  expect(source).toContain("StandardScaler()");
  expect(source).toContain("SimpleImputer(strategy='most_frequent')");
  expect(source).toContain("OneHotEncoder(handle_unknown='ignore'");
  expect(source).toContain("zero_division=0");
  expect(source).toContain("NOTEBOOKPILOT_RESULT");
  expect(source).toContain('"datasetHash":"aaaaaaaa');
});

test("splits raw rows before fitting preprocessing and records provenance", () => {
  const source = generateTrainingCell(base);
  const split = source.indexOf("train_test_split(");
  const fit = source.indexOf("pipeline.fit(X_train, y_train)");
  expect(split).toBeGreaterThan(0);
  expect(fit).toBeGreaterThan(split);
  expect(source).not.toContain("fit_transform(X)");
  expect(source).toContain("splitFingerprint");
  expect(source).toContain("classOrder");
  expect(source).toContain("sklearn.__version__");
  expect(source).toContain("pd.__version__");
  expect(source).toContain("numeric_imputer.statistics_");
  expect(source).toContain("categorical_imputer.statistics_");
});

test("emits explicit guards for class and split feasibility", () => {
  const source = generateTrainingCell(base);
  expect(source).toContain("Target must contain at least two classes");
  expect(source).toContain("Each target class needs at least two rows");
  expect(source).toContain(
    "Train and test partitions must each fit every class",
  );
  expect(source).toContain("Target contains missing values");
});
