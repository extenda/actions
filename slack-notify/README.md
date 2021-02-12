# slack-notify

This GitHub Action can be used to send messages to Slack through the SlackNotifications app added to our extenda workspace.
If the channel you are posting a message on is private make sure to invite the SlackNotifications app before using this action.

## Usage

See [action.yml](action.yml).

### Examples

#### Without channel input

This example will load a `slack-token` named slack-notify-token from the GCP Secret Manager accessible using
the provided `service-account-key`.

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
