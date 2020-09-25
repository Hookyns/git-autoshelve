import { SimpleGit } from "simple-git/promise";

export interface ISetting
{
	repositoryBasePath: string;
	autoshelveRepositoryPath: string;
	git: SimpleGit;
	originGit: SimpleGit;
}

export class Setting
{
	private readonly setting: ISetting;

	get repositoryBasePath(): string
	{
		return this.setting.repositoryBasePath;
	}

	get autoshelveRepositoryPath(): string
	{
		return this.setting.autoshelveRepositoryPath;
	}

	get git(): SimpleGit
	{
		return this.setting.git;
	}

	get originGit(): SimpleGit
	{
		return this.setting.originGit;
	}

	constructor(setting: ISetting)
	{
		this.setting = setting;
	}
}