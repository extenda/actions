# slack-notify

This GitHub Action can be used to send messages to Slack through the SlackNotifications app added to our extenda workspace.
If the channel you are posting a message on is private make sure to invite the SlackNotifications app before using this action.

## Comparing [slack-message](../slack-message/README.md) action

The main difference in this action lies in being able to publish to any public slack channel that you set as input, for private channels it is required to add this app to the channel(slackNotifications app). Whereas the github slack-message would need to subscribe to each and every repository that might require a notification alert.

## Usage

See [action.yml](action.yml).


### Examples

#### Without channel input

This example will load a `slack-token` named slack-notify-token from the GCP Secret Manager accessible using
the provided `service-account-key`. 
If no channel is set this action will automatically look for the clan_slack_channelsecret stored in your clan secret manager and referese your clan monitoring channel.

```yaml
on: push

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Notify Slack
        uses: extenda/actions/slack-notify@v0
        with:
          text: |
            This message is sent by GitHub Actions :rocket:

            It contains *formatting* and multiple lines.
          service-account-key: ${{ secrets.SECRET_AUTH_STAGING }}
```

#### With channel input

```yaml
on: push

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Notify Slack
        uses: extenda/actions/slack-notify@v0
        with:
          text: |
            This message is sent by GitHub Actions :rocket:

            It contains *formatting* and multiple lines.
          service-account-key: ${{ secrets.SECRET_AUTH_STAGING }}
          channel: engineering-iam-monitor
```

#### With file attached

```yaml
on: push

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1

      - name: Notify Slack
        uses: extenda/actions/slack-notify@v0
        with:
          text: |
            This message is sent by GitHub Actions :rocket:

            It contains *formatting* and multiple lines.
          service-account-key: ${{ secrets.SECRET_AUTH_STAGING }}
          channel: engineering-iam-monitor
          file: reports/report.log
```
