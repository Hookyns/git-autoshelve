import { Setting }           from "@this/src/Setting";
import * as path             from "path";
import * as fs               from "fs";
import * as hidefile         from "hidefile";
import * as simpleGitPromise from "simple-git/promise";
import { SimpleGit }         from "simple-git/promise";

export const settingProvider = {
	getSetting
};

function getRepositoryBasePath(): string
{
	const repoPath = process.argv[2];

	if (repoPath == undefined)
	{
		throw new Error("You must specify base repository path as program argument.");
	}
	
	if (path.isAbsolute(repoPath)) {
		return repoPath;
	}

	return path.resolve(process.cwd(), repoPath);
}

async function getRemote(originGit: SimpleGit, remoteName: string)
{
	const remotes = await originGit.getRemotes(true);
	let serverRemote = undefined;

	if (remotes.length == 1)
	{
		serverRemote = remotes[0].refs.push;
	}
	else
	{
		serverRemote = remotes.filter(remote => remote.name == "origin" || (remoteName && remote.name == remoteName))[0]?.refs.push;
	}

	if (!serverRemote)
	{
		throw new Error("No remote repository found.");
	}

	return serverRemote;
}

async function initAutoshelve(getGit: () => SimpleGit, originGit: SimpleGit, autoshelveRepositoryPath: string, repositoryBasePath: string, remoteName: string)
{
	fs.mkdirSync(autoshelveRepositoryPath);
	hidefile.hideSync(autoshelveRepositoryPath);

	const git = getGit();
	await git.init();
	await git.addRemote("origin", repositoryBasePath);
	const serverRemote = await getRemote(originGit, remoteName);
	await git.addRemote("server", serverRemote);
}

function getAutoshelveRepositoryPath(repositoryBasePath: string): string
{
	return path.resolve(repositoryBasePath, "..", `.${path.basename(repositoryBasePath)}_autoshelved`);
}

function ensureAutoshelveRepo(getGit: () => SimpleGit, originGit: SimpleGit, autoshelveRepositoryPath, repositoryBasePath): Promise<void>
{
	return new Promise((resolve, reject) => {
		try
		{
			hidefile.isHidden(autoshelveRepositoryPath, async (error, result) => {
				if (error)
				{
					await initAutoshelve(getGit, originGit, autoshelveRepositoryPath, repositoryBasePath, process.argv[3]);
				}

				resolve(autoshelveRepositoryPath);
			});
		}
		catch (e)
		{
			reject(e);
		}
	});
}

async function getSetting(): Promise<Setting>
{
	const repositoryBasePath = getRepositoryBasePath();
	const autoshelveRepositoryPath = getAutoshelveRepositoryPath(repositoryBasePath);

	const getGit: () => SimpleGit = () => simpleGitPromise(autoshelveRepositoryPath);
	const originGit = simpleGitPromise(repositoryBasePath);
	
	await ensureAutoshelveRepo(getGit, originGit, autoshelveRepositoryPath, repositoryBasePath);

	return new Setting({
		repositoryBasePath,
		autoshelveRepositoryPath,
		originGit,
		git: getGit()
	});
}