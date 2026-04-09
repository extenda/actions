FROM liquibase/liquibase:5.0.2-alpine

# Add Cloud Spanner Liquibase extension
ENV SPANNER_EXTENSION_BASE_URL=https://github.com/cloudspannerecosystem/liquibase-spanner/releases/download
ENV SPANNER_EXTENSION_VERSION=4.33.0.3
ENV SPANNER_EXTENSION_JAR_NAME=liquibase-spanner-${SPANNER_EXTENSION_VERSION}-all.jar

ARG SPANNER_EXTENSION_URL=${SPANNER_EXTENSION_BASE_URL}/${SPANNER_EXTENSION_VERSION}/${SPANNER_EXTENSION_JAR_NAME}

ENV LIQUIBASE_LOG_LEVEL=WARNING
ENV LIQUIBASE_SQL_LOG_LEVEL=INFO
ENV LIQUIBASE_SHOW_BANNER=false
ENV LIQUIBASE_COMMAND_CHANGELOG_FILE=changelog-master.yaml

USER liquibase

# Download and install the Spanner extension
ADD --chown=liquibase:liquibase ${SPANNER_EXTENSION_URL} /liquibase/lib/liquibase-spanner.jar

ENTRYPOINT ["docker-entrypoint.sh"]

# Default command is handled via GitHub Action inputs
# but kept here for standalone Docker usage
CMD ["update"]
