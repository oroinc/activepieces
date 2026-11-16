pipeline {
    agent {
        label 'docker1p'
    }
    
    options {
        buildDiscarder(logRotator(artifactDaysToKeepStr: '', artifactNumToKeepStr: '50', daysToKeepStr: '14', numToKeepStr: '50'))
        timeout(time: 30, unit: 'MINUTES')
        ansiColor('xterm')
        timestamps()
        disableConcurrentBuilds(abortPrevious: true)
    }

    environment {
        ORO_PROJECT = 'ocir.eu-frankfurt-1.oci.oraclecloud.com/frecfpcrj6gd/oro-product-development/'
        ORO_AP_IMAGE = "${ORO_PROJECT}activepieces"
    }
    
    stages {      
        stage('Build') {
            steps {
                script {
                    env.ORO_AP_IMAGE_TAG = env.BUILD_TAG
                        .toLowerCase()
                        .replaceAll('%2F', '-')
                        .replaceAll('[^a-z0-9._-]', '-')
                        .replaceAll('-+', '-')
                        .take(128)
                }
                withCredentials([usernamePassword(credentialsId: 'ocir.eu-frankfurt-1.oci.oraclecloud.com', usernameVariable: 'ORO_REGISTRY_CREDS_USR', passwordVariable: 'ORO_REGISTRY_CREDS_PSW')]) {
                    sh label: 'docker login ocir.eu-frankfurt-1.oci.oraclecloud.com', script: 'echo $ORO_REGISTRY_CREDS_PSW | docker login -u $ORO_REGISTRY_CREDS_USR --password-stdin ocir.eu-frankfurt-1.oci.oraclecloud.com'
                }
                script {
                    // A patched release moves "latest" only when its version is not lower than the one "latest" holds
                    env.PROMOTE_LATEST = 'false'
                    if (env.TAG_NAME?.endsWith('-patched')) {
                        env.PROMOTE_LATEST = sh(label: 'compare with the latest image version', returnStdout: true, script: '''
                            current=$(docker buildx imagetools inspect "$ORO_AP_IMAGE:latest" --format '{{json .Image}}' 2>/dev/null | sed -n 's/.*"org.opencontainers.image.version": *"\\([^"]*\\)".*/\\1/p' | head -1)
                            new=${TAG_NAME%-patched}
                            old=${current%-patched}
                            if [ -z "$old" ] || [ "$(printf '%s\\n%s\\n' "$old" "$new" | sort -V | tail -1)" = "$new" ]; then echo true; else echo false; fi
                        ''').trim()
                    }
                }
                sh label: 'build and push docker image', script: '''
                    printenv | sort
                    docker buildx bake -f docker-bake.hcl --print
                    docker buildx bake -f docker-bake.hcl --progress=plain --push
                '''
            }
        }
    }

    post {
        always {
            sh label: 'docker logout ocir.eu-frankfurt-1.oci.oraclecloud.com', script: '''
                docker logout ocir.eu-frankfurt-1.oci.oraclecloud.com || true
            '''
        }
    }
}
