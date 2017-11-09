const jenkinsApi = require('jenkins-api'),
      moment = require('moment'),
      repoRoot = process.env.STASH_REPO_ROOT; //Looks like https://<stash_url>m/projects/<project_id>/repos/

class JenkinsBuildStatusUtil {
  constructor(jenkinsUrl) {
    this.jenkinsUrl = jenkinsUrl;
    this.jenkins = jenkinsApi.init(this.jenkinsUrl);
  }

  getJob(jobName) {
    return new Promise(resolve => this.jenkins.job_info(jobName, async (err, lastBuild) => resolve((await lastBuild))));
  }

  getJobs(jobMatcher) {
    jobMatcher = jobMatcher || process.env.JOB_MATCHER;
    return new Promise(resolve => this.jenkins.all_jobs(async (err, jobs) => resolve((await jobs.filter(job => job.name.indexOf(jobMatcher) > -1)))));
  }

  getBuild(jobName, buildNumber) {
    return new Promise(resolve => this.jenkins.build_info(jobName, buildNumber, async (err, buildInfo) => resolve((await buildInfo))));
  }

  getLastBuild(jobName) {
    return new Promise(resolve => this.jenkins.last_result(jobName, async (err, result) => resolve(result)));
  }

  getLastFailure(jobName) {
    return new Promise(resolve => this.jenkins.last_failure(jobName, async (err, result) => resolve(result)));
  }

  getLastSuccess(jobName) {
    return new Promise(resolve => this.jenkins.last_success(jobName, async (err, result) => resolve(result)));
  }

  // Was the last successful build within the threshold
  isLastSuccessWithinThreshold(jobName, buildThreshold) {
    return new Promise(resolve => resolve(this.getLastSuccess(jobName).then(res => moment().subtract(buildThreshold, 'hours').isSameOrBefore(res.timestamp))));
  }

  // Was the lastest build a failure?
  // This will help distinguish sucesses outside the threshold
  isLastBuildSuccessful(jobName) {
    return new Promise(resolve => this.jenkins.last_build_info(jobName, async (err, lastBuild) => resolve((await lastBuild.result) === 'SUCCESS')));
  }

  isBuildFailureFlagged(jobName, buildThreshold) {
    return Promise.all([this.isLastSuccessWithinThreshold(jobName, buildThreshold), this.isLastBuildSuccessful(jobName)]).then(res => res[0] ? false : !res[1]);
  }

  getFlaggedJobs(jobs, buildThreshold) {
    const flaggedJobs = [];

    return Promise.all(jobs.map(async job => {
      const flagged = await this.isBuildFailureFlagged(job.name, buildThreshold);

      if (flagged) flaggedJobs.push(job);
    })).then(() => flaggedJobs);
  }

  getFailureDetails(jobName) {
    return new Promise(resolve => this.getLastFailure(jobName).then(res => {
      let repoName = res.actions[9].remoteUrls[0];
      repoName = repoName.substr(repoName.lastIndexOf('/') + 1).replace('.git', '');
      return resolve({
        job: jobName,
        repoName: repoName,
        buildDetails: {
          url: res.url,
          number: res.number,
          date: moment(res.timestamp).format('MM-DD-YY'),
          buildDuration: moment.utc(res.duration).format('mm:ss')
        },
        commitDetails: {
          commitId: res.changeSet.items[0].commitId,
          author: res.changeSet.items[0].author.fullName,
          comment: res.changeSet.items[0].msg,
          commitUrl: `${repoRoot}/${repoName}/commits/${res.changeSet.items[0].commitId}`
        }
      });
    }));
  }

  // TODO - resultSize
  getBuilds(jobName, resultSize) {
    return new Promise(resolve => this.jenkins.all_builds(jobName, async (err, result) => resolve(result)));
  }

  // TODO
  getAverageSuccessBuildTime(jobName) {}

  // TODO
  getAverageFailureBuildTime(jobName) {}

  // TODO
  getSuccessfulBuildProbability(jobName) {}
}

module.exports = JenkinsBuildStatusUtil;