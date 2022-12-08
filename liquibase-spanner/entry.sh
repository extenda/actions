#!/bin/bash

OPERATION=$1
CLASSPATH=$2
CHANGELOGFILE=$3
SERVICE_ACCOUNT_KEY=$4
SPANNER_EXTENSION_URL=$5
URL=$6
COUNT=$7
TAG=$8
DATE=$9
REFERENCEURL=${10}

PARAMS=()
VALUES=()

function check_required_param() {
    local OP=$1
    local KEY=$2
    local VAL=$3
    local IsVALUE=${4:-false}
    if [ -z "$VAL" ]
    then
        echo "$OP requires $KEY to not be empty"
        exit 1
    fi
    if [ "$IsVALUE" = true ]
    then
        VALUES+=($VAL)
    else
        PARAMS+=(--$KEY=$VAL)
    fi
}


function validate_operation() {
    case $OPERATION in
    update)
        check_required_param update classpath $CLASSPATH
        check_required_param update changeLogFile $CHANGELOGFILE
        check_required_param update url $URL
        ;;

    updateCount)
        check_required_param updateCount classpath $CLASSPATH
        check_required_param updateCount changeLogFile $CHANGELOGFILE
        check_required_param updateCount url $URL
        check_required_param updateCount count $COUNT true
        ;;

    tag)
        check_required_param tag url $URL
        check_required_param tag tag $TAG true
        ;;

    updateToTag)
        check_required_param updateToTag classpath $CLASSPATH
        check_required_param updateToTag changeLogFile $CHANGELOGFILE
        check_required_param updateToTag url $URL
        check_required_param updateToTag tag $TAG true
        ;;

    rollback)
        check_required_param rollback classpath $CLASSPATH
        check_required_param rollback changeLogFile $CHANGELOGFILE
        check_required_param rollback url $URL
        check_required_param rollback tag $TAG true
        ;;

    rollbackCount)
        check_required_param rollbackCount classpath $CLASSPATH
        check_required_param rollbackCount changeLogFile $CHANGELOGFILE
        check_required_param rollbackCount url $URL
        check_required_param rollbackCount count $COUNT true
        ;;

    rollbackToDate)
        check_required_param rollbackToDate classpath $CLASSPATH
        check_required_param rollbackToDate changeLogFile $CHANGELOGFILE
        check_required_param rollbackToDate url $URL
        check_required_param rollbackToDate date $DATE true
        ;;

    updateSQL)
        check_required_param updateSQL classpath $CLASSPATH
        check_required_param updateSQL changeLogFile $CHANGELOGFILE
        check_required_param updateSQL url $URL
        ;;

    futureRollbackSQL)
        check_required_param futureRollbackSQL classpath $CLASSPATH
        check_required_param futureRollbackSQL changeLogFile $CHANGELOGFILE
        check_required_param futureRollbackSQL url $URL true
        ;;

    status)
        check_required_param status classpath $CLASSPATH
        check_required_param status changeLogFile $CHANGELOGFILE
        check_required_param status url $URL
        ;;

    history)
        check_required_param history url $URL
        ;;

    diff)
        check_required_param diff url $URL
        check_required_param diff referenceUrl $REFERENCEURL true
        ;;

    validate)
        check_required_param validate url $URL
        check_required_param validate changeLogFile $CHANGELOGFILE
        ;;

    *)
        echo "$OPERATION is not a valid operation"
        exit 1
        ;;
    esac
}

validate_operation

# Install spanner extension
wget -O /liquibase/lib/liquibase-spanner.jar $SPANNER_EXTENSION_URL

# GCloud auth using serviceAccountKey
export GOOGLE_APPLICATION_CREDENTIALS="/liquibase/spanner-service-account-key.json"
echo $SERVICE_ACCOUNT_KEY | base64 -d > $GOOGLE_APPLICATION_CREDENTIALS

docker-entrypoint.sh "${PARAMS[@]}" $OPERATION "${VALUES[@]}"
