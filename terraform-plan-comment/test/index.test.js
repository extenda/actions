jest.mock('../../utils/src/pull-request-info');
jest.mock('@actions/core');
jest.mock('../src/generate-outputs');

const mockComment = jest.fn();

jest.mock('@actions/github', () => ({
  GitHub: function GitHub() {
    return {
      issues: {
        createComment: mockComment,
      },
    };
  },
  context: {
    repo: () => ({
      owner: 'extenda',
      repo: 'actions',
    }),
  },
}));

const core = require('@actions/core');
const { getPullRequestInfo } = require('../../utils/src/pull-request-info');
const action = require('../src/index');
const generateOutputs = require('../src/generate-outputs');

const orgEnv = process.env;

describe('Terraform plan comment', () => {
  afterEach(() => {
    jest.clearAllMocks();
    process.env = orgEnv;
  });

  beforeEach(() => {
    getPullRequestInfo.mockResolvedValueOnce({
      number: 1,
      base: { ref: 'master' },
      head: { ref: 'feature/test' },
    });
    core.getInput.mockReturnValue('');
    process.env = {
      ...orgEnv,
      GITHUB_WORKFLOW: 'Terraform',
      GITHUB_REPOSITORY: 'extenda/actions',
    };
  });

  test('It can generate comment for multiple plans', async () => {
    generateOutputs.mockResolvedValueOnce([
      { module: 'folder/moduleA', output: 'Plan A output\n0 to add 1 to change 0 to destroy', status: 0 },
      { module: 'folder/moduleB', output: 'Plan B output\n1 to add 0 to change 0 to destroy', status: 0 },
      { module: 'folder/nested/moduleC', output: 'Plan C output\n1 to add 1 to change 1 to destroy', status: 0 },
      { module: 'folder/nested', output: 'Plan nested output\n1 to add 0 to change 0 to destroy', status: 0 },
    ]);

    const comment = await action();
    expect(comment).toEqual(`### :mag: Terraform plan changes

The output only includes modules with changes.

#### :orange_book: \`folder/moduleA\`

<details>
<summary>0 to add 1 to change 0 to destroy</summary>

\`\`\`hcl
Plan A output
0 to add 1 to change 0 to destroy
\`\`\`

</details>

#### :green_book: \`folder/moduleB\`

<details>
<summary>1 to add 0 to change 0 to destroy</summary>

\`\`\`hcl
Plan B output
1 to add 0 to change 0 to destroy
\`\`\`

</details>

#### :closed_book: \`folder/nested/moduleC\`

<details>
<summary>1 to add 1 to change 1 to destroy</summary>

\`\`\`hcl
Plan C output
1 to add 1 to change 1 to destroy
\`\`\`

</details>

#### :green_book: \`folder/nested\`

<details>
<summary>1 to add 0 to change 0 to destroy</summary>

\`\`\`hcl
Plan nested output
1 to add 0 to change 0 to destroy
\`\`\`

</details>

*Workflow: \`Terraform\`*
*Working directory: \`${process.cwd()}\`*`);
    expect(mockComment).toHaveBeenCalled();
  });

  test('It can generate comment for single plan', async () => {
    generateOutputs.mockResolvedValueOnce([
      { module: 'work', output: 'Plan output\nPlan: 1 to add 0 to change 0 to destroy\n\n', status: 0 },
    ]);

    const comment = await action();
    expect(comment).toEqual(`### :mag: Terraform plan changes

The output only includes modules with changes.

#### :green_book: \`work\`

<details>
<summary>Plan: 1 to add 0 to change 0 to destroy</summary>

\`\`\`hcl
Plan output
Plan: 1 to add 0 to change 0 to destroy


\`\`\`

</details>

*Workflow: \`Terraform\`*
*Working directory: \`${process.cwd()}\`*`);
    expect(mockComment).toHaveBeenCalled();
  });

  test('It can generate comment for no changes', async () => {
    generateOutputs.mockResolvedValueOnce([]);
    const comment = await action();
    expect(comment).toEqual(`### :white_check_mark: Terraform plan with no changes\n\nTerraform plan reported no changes.\n\n*Workflow: \`Terraform\`*\n*Working directory: \`${process.cwd()}\`*`);
    expect(mockComment).toHaveBeenCalled();
  });

  test('It skips execution if not a pull request', async () => {
    getPullRequestInfo.mockReset();
    getPullRequestInfo.mockResolvedValueOnce(null);
    const comment = await action();
    expect(core.warning).toHaveBeenCalledWith('Skipping execution - No open pull-request found.');
    expect(generateOutputs).not.toHaveBeenCalled();
    expect(comment).toBeNull();
  });

  test('It can generate comment for custom repo and pull number', async () => {
    core.getInput.mockReset();
    core.getInput.mockReturnValueOnce('plan.out')
      .mockReturnValueOnce('infra')
      .mockReturnValueOnce('github-token')
      .mockReturnValueOnce('extenda/test-repo')
      .mockReturnValueOnce('3');
    generateOutputs.mockResolvedValueOnce([]);
    const comment = await action();
    expect(generateOutputs).toHaveBeenCalled();
    expect(comment).toBeTruthy();
    expect(mockComment.mock.calls[0][0]).toMatchObject({
      owner: 'extenda',
      repo: 'test-repo',
    });
  });

  test('It throws if remote repository and no pull number is provided', async () => {
    core.getInput.mockReset();
    core.getInput.mockReturnValueOnce('plan.out')
      .mockReturnValueOnce('infra')
      .mockReturnValueOnce('github-token')
      .mockReturnValueOnce('extenda/test-repo')
      .mockReturnValueOnce('');
    generateOutputs.mockResolvedValueOnce([]);
    await expect(action()).rejects.toEqual(new Error('pull-request-number must be provided for remote repository.'));
  });

  test('It can generate a custom footer', async () => {
    core.getInput
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('')
      .mockReturnValueOnce('Custom footer with\nremoved new line and *markdown*\n\nNext section. Preserved.');
    generateOutputs.mockResolvedValueOnce([]);
    const comment = await action();
    expect(comment).toEqual(`### :white_check_mark: Terraform plan with no changes

Terraform plan reported no changes.

Custom footer with removed new line and *markdown*

Next section. Preserved.

*Workflow: \`Terraform\`*
*Working directory: \`${process.cwd()}\`*`);
    expect(mockComment).toHaveBeenCalled();
  });
});
