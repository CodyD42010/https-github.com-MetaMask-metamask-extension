const { execSync } = require('child_process');
const axios = require('axios');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const gitRemote = 'https://api.github.com/repos/MetaMask/metamask-extension'; // Configure your git remote URL here

const argv = yargs(hideBin(process.argv)).option('push', {
  describe: 'Push the cherry-picked branch to the remote',
  type: 'boolean',
  default: false,
}).argv;

const getPrData = async (prNumber) => {
  const url = `${gitRemote}/pulls/${prNumber}`;
  try {
    const response = await axios.get(url);
    // console.log('response',response)
    return {
      branchName: response.data.head.ref,
      mergeCommitHash: response.data.merge_commit_sha,
    };
  } catch (error) {
    console.error('Error fetching PR data:', error.message);
    process.exit(1);
  }
};

const cherryPickPr = async () => {
  const { pickTo, pickFrom } = argv;
  if (!pickTo || !pickFrom) {
    console.error('Both pickTo and pickFrom arguments are required');
    process.exit(1);
  }

  const pickToData = await getPrData(pickTo);
  const pickFromData = await getPrData(pickFrom);

  execSync(`git checkout ${pickToData.branchName}`, { stdio: 'inherit' });
  const newBranchName = `${pickFromData.mergeCommitHash}-picked-to-${pickToData.branchName}`;
  execSync(`git checkout -b ${newBranchName}`, { stdio: 'inherit' });

  try {
    execSync(`git cherry-pick ${pickFromData.mergeCommitHash}`, { stdio: 'inherit' });
    console.log('Cherry-pick successful!');

    if (argv.push) {
      execSync(`git push --set-upstream origin ${newBranchName}`, { stdio: 'inherit' });
      console.log(`Branch pushed! Open the following URL to create a PR: ${gitRemote}/compare/${pickToData.branchName}...${newBranchName}?expand=1`);
    }
  } catch (error) {
    console.error('Cherry-pick might have conflicts. Resolve them, and then run this command again without --push to continue.');
    process.exit(1);
  }
};

cherryPickPr();