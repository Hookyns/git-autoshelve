import "module-alias/register";
import { settingProvider }     from "@this/src/SettingProvider";
import { Setting }             from "@this/src/Setting";
import { BranchSummaryBranch } from "simple-git/typings/response";
import * as os                 from "os";
import * as fs                 from "fs";
import * as path                   from "path";
import { CleanOptions, SimpleGit } from "simple-git";

class Application
{
	private setting: Setting;

	async run()
	{
		this.setting = await settingProvider.getSetting();

		// Target autoshelve branch name
		const branch: BranchSummaryBranch = await this.getCurrentBranch(this.setting.originGit, true);
		const autoshelveBranchName = `autoshelve/${os.userInfo().username}/${branch.name}`;

		// Reset state to origin
		await this.resetToOrigin(branch, autoshelveBranchName);

		// Update autoshelve branch by not-commited changes
		await this.modifyAutoshelveBranch();

		// Commit changes
		await this.setting.git.add("./*");
		await this.setting.git.commit(new Date().toISOString());

		// Push to remote
		await this.setting.git.push("server", autoshelveBranchName);
	}

	private async getCurrentBranch(git: SimpleGit, throwIfNotExists: boolean = false): Promise<BranchSummaryBranch | undefined>
	{
		const branches = await git.branchLocal();

		if (!branches)
		{
			if (throwIfNotExists)
			{
				throw new Error("No branch found!");
			}
			
			return undefined;
		}

		return Object.entries(branches.branches).filter(([_, branch]) => branch.current)[0]?.[1];
	}

	/**
	 * Reset state of autoshelve branch to origin
	 * @param branch
	 * @param autoshelveBranchName
	 * @private
	 */
	private async resetToOrigin(branch: BranchSummaryBranch, autoshelveBranchName: string)
	{
		await this.setting.git.fetch(["origin"]);
		// await this.setting.git.checkout(["-B", autoshelveBranchName, `origin/${branch.name}`]);
		// await this.setting.git.reset(["--hard", branch.commit]);
		// await this.setting.git.clean(CleanOptions.FORCE + CleanOptions.RECURSIVE);
		
		const autoshelveBranch = await this.getCurrentBranch(this.setting.git);

		// It's first run
		if (!autoshelveBranch) {
			console.log("Checkouting origin branch for first time");
			await this.setting.git.checkout(["-B", autoshelveBranchName, `origin/${branch.name}`]);
		}
		else {
			await this.setting.git.checkout([autoshelveBranchName]);
			// await this.setting.git.checkout(["-b", autoshelveBranchName, `origin/${branch.name}`]);
			await this.setting.git.clean(CleanOptions.FORCE + CleanOptions.RECURSIVE);
			// Revert last commit
			await this.setting.git.revert(autoshelveBranch.commit);
			// await this.setting.git.merge({[`origin/${branch.name}`]: null });
		}

		// TODO: Change the process to merging (better then still doing whole commits)
		// await this.setting.git.checkout(["-B", autoshelveBranchName, `origin/${branch.name}`]);
		// await this.setting.git.clean(CleanOptions.FORCE + CleanOptions.RECURSIVE);
		// await this.setting.git.revert(branch.commit);
	}

	/**
	 * Update autoshelve branch by not-commited changes
	 * @private
	 */
	private async modifyAutoshelveBranch()
	{
		const status = await this.setting.originGit.status();

		for (let file of status.files)
		{
			const targetFilePath = path.join(this.setting.autoshelveRepositoryPath, file.path);

			// Deleted
			if (file.working_dir == "D")
			{
				fs.unlinkSync(targetFilePath);
				console.log("Deleting file ", file.path);
			}
			else
			{
				fs.copyFileSync(path.join(this.setting.repositoryBasePath, file.path), targetFilePath);
				console.log("Modding file ", file.path);

			}
		}
	}
}

(async () => {
	try
	{
		await new Application().run();
	}
	catch (e)
	{
		console.error(e.message, e.stack);
		process.exit(-1);
	}
})();
