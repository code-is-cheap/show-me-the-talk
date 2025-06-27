export class ProjectContext {
    constructor(
        private readonly originalPath: string,
        private readonly workingDirectory: string
    ) {
        if (!originalPath) {
            throw new Error('Project path cannot be empty');
        }
    }

    getOriginalPath(): string {
        return this.originalPath;
    }

    getWorkingDirectory(): string {
        return this.workingDirectory;
    }

    getProjectName(): string {
        const parts = this.originalPath.split('/');
        return parts[parts.length - 1] || 'unknown';
    }

    // Additional properties for TUI compatibility
    get path(): string {
        return this.originalPath;
    }

    get name(): string {
        return this.getProjectName();
    }

    // Convert encoded directory name back to original path
    static fromEncodedDirectory(encodedDir: string): ProjectContext {
        // Keep the encoded directory name as the original path for display purposes
        // The working directory is used internally for file operations
        return new ProjectContext(encodedDir, encodedDir);
    }

    equals(other: ProjectContext): boolean {
        return this.originalPath === other.originalPath &&
               this.workingDirectory === other.workingDirectory;
    }

    toString(): string {
        return this.originalPath;
    }
}