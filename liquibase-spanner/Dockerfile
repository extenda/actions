FROM liquibase/liquibase:5.0.2-alpine

# Add Cloud Spanner Liquibase extension (needed for Spanner emulator URL)
ENV SPANNER_EXTENSION_BASE_URL=https://github.com/cloudspannerecosystem/liquibase-spanner/releases/download
ENV SPANNER_EXTENSION_VERSION=4.33.0
ENV SPANNER_EXTENSION_JAR_NAME=liquibase-spanner-${SPANNER_EXTENSION_VERSION}-all.jar
ENV SPANNER_JAR_PATH=${SPANNER_EXTENSION_BASE_URL}/${SPANNER_EXTENSION_VERSION}/${SPANNER_EXTENSION_JAR_NAME}

ENV LIQUIBASE_LOG_LEVEL=WARNING
ENV LIQUIBASE_SQL_LOG_LEVEL=INFO
ENV LIQUIBASE_SHOW_BANNER=false
ENV LIQUIBASE_COMMAND_CHANGELOG_FILE=changelog-master.yaml

USER liquibase

# Install postgres driver needed for community edition of Liquibase
# RUN lpm add postgresql --global

# Download and install the Spanner extension jar
ADD --chown=liquibase:liquibase ${SPANNER_JAR_PATH} /liquibase/lib/liquibase-spanner.jar

ENTRYPOINT ["docker-entrypoint.sh"]

# Default command is handled via GitHub Action inputs
# but kept here for standalone Docker usage
CMD ["update"]
