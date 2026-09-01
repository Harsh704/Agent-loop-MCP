import path from "node:path";

export interface PathCheckResult {
  allowed: boolean;
  absolutePath?: string;
  reason?: string;
}

const BLOCKED_DIRECTORIES = new Set([
  "node_modules",
]);

const BLOCKED_PATHS = new Set([
  "evals",
]);

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);

  return (
    relative === "" ||
    (!relative.startsWith("..") &&
      !path.isAbsolute(relative))
  );
}

export function validateRepositoryPath(
  repositoryRoot: string,
  requestedPath: string,
): PathCheckResult {
  if (!requestedPath || requestedPath.trim() === "") {
    return {
      allowed: false,
      reason: "Path cannot be empty.",
    };
  }

  const root = path.resolve(repositoryRoot);
  const absolutePath = path.resolve(root, requestedPath);

  // Prevent path traversal outside the repository.
  if (!isInside(root, absolutePath)) {
    return {
      allowed: false,
      reason: "Path is outside the repository boundary.",
    };
  }

  const relativePath = path.relative(root, absolutePath);
  const segments = relativePath.split(path.sep);

  // Prevent access to blocked directories.
  if (segments.some((segment) => BLOCKED_DIRECTORIES.has(segment))) {
    return {
      allowed: false,
      reason: "Access to node_modules is not allowed.",
    };
  }

  // Prevent access to the evaluation harness.
  if (
    segments.length > 0 &&
    BLOCKED_PATHS.has(segments[0])
  ) {
    return {
      allowed: false,
      reason: "Access to the evaluation harness is not allowed.",
    };
  }

  return {
    allowed: true,
    absolutePath,
  };
}