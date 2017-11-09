const JenkinsBuildStatusUtil = require('./src/index.js');

const buildStatusUtil = new JenkinsBuildStatusUtil('http://localhost:8080');
buildStatusUtil.getFailureDetails('develop').then((res) => console.log(res));

// buildStatusUtil.getLastSuccess('dev-center develop').then(res => console.log(res));
