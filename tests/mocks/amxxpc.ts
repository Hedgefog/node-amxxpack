import path from 'path';

const amxxpcMock = jest.fn().mockImplementation((params) => ({
  output: {
    messages: [{
      type: 'echo',
      text: 'Mocked function successed'
    }],
    error: false,
    aborted: false
  },
  plugin: path.parse(params.dest).base,
  success: true
}));

export default amxxpcMock;
