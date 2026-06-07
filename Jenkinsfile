pipeline {
    agent {
        label 'docker1p'
    }
    
    options {
        buildDiscarder(logRotator(artifactDaysToKeepStr: '', artifactNumToKeepStr: '50', daysToKeepStr: '14', numToKeepStr: '50'))
        timeout(time: 30, unit: 'MINUTES')
        ansiColor('xterm')
        timestamps()
    }

    environment {
        ORO_PROJECT = 'ocir.eu-frankfurt-1.oci.oraclecloud.com/frecfpcrj6gd/oro-product-development/'
        ORO_AP_IMAGE = "${ORO_PROJECT}activepieces"
    }
    
    stages {      
        stage('Build') {
            steps {
                script {
                    env.ORO_AP_IMAGE_TAG = env.BUILD_TAG.replaceAll('/', '-').replaceAll('%2F', '-')
                }
                withCredentials([usernamePassword(credentialsId: 'ocir.eu-frankfurt-1.oci.oraclecloud.com', usernameVariable: 'ORO_REGISTRY_CREDS_USR', passwordVariable: 'ORO_REGISTRY_CREDS_PSW')]) {
                    sh label: 'docker login ocir.eu-frankfurt-1.oci.oraclecloud.com', script: 'echo $ORO_REGISTRY_CREDS_PSW | docker login -u $ORO_REGISTRY_CREDS_USR --password-stdin ocir.eu-frankfurt-1.oci.oraclecloud.com'
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
