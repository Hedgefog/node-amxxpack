import logger from "../logger/logger";

export default class PluginsDependencies {
  private headersMap = new Map<string, Set<string>>();

  public addDependency(include: string, pluginPath: string) {
    if (!this.headersMap.has(include)) {
      this.headersMap.set(include, new Set());
    }

    logger.debug(`Added dependency: ${include} -> ${pluginPath}`);

    this.headersMap.get(include).add(pluginPath);
  }

  public removeDependency(include: string, pluginPath: string) {
    const dependencies = this.headersMap.get(include);
    if (!dependencies) return;

    dependencies.delete(pluginPath);
  }

  public clearDependencies(include: string) {
    this.headersMap.delete(include);
  }

  public getDependencies(include: string) {
    const dependencies = this.headersMap.get(include);
    if (!dependencies) return [];

    return Array.from(dependencies);
  }
}
