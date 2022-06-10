import { Command, flags } from '@oclif/command';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import ipt from 'ipt';
import chalk from 'chalk';
import nx from '@jswork/next';
import NxYamlConfiguration from '@jswork/next-yaml-configuration';
import '@jswork/next-tmpl';

const EXEC_MODE = ' && ';
const ENTRY_FILE = '.ycc.yml';
const opts = { stdin: process.stdin, stdout: process.stdout };
const splYml =
  'name: project_name\n' +
  'vars:\n' +
  '  home: ${{ env.HOME }}\n' +
  '  var1: value1\n' +
  'commands:\n' +
  '  cmd1:\n' +
  '    - echo "hello"\n' +
  '  cmd2:\n' +
  '    - echo "world"\n';

class YamlCommandCli extends Command {
  static strict = false;
  static description = 'describe the command here';

  static flags = {
    help: flags.help({ char: 'h' }),
    quite: flags.boolean({ char: 'q', description: 'quite mode', default: false }),
    init: flags.boolean({ char: 'i', description: 'init config file' })
  };

  get commands() {
    return this.conf.get('commands');
  }

  get entryfile() {
    return path.join(process.cwd(), ENTRY_FILE);
  }

  private conf;

  private getYmlPath(inCfgPath) {
    const cfg = inCfgPath || path.join(process.cwd(), ENTRY_FILE);
    const defPath = path.join(process.env.HOME!, ENTRY_FILE);
    if (fs.existsSync(defPath)) {
      return [defPath].concat(cfg);
    }
    return [defPath];
  }

  private getCmdStr(inCmd, inArgv) {
    const cmds = inCmd.split(',');
    const envs = this.conf.get('envs');
    const cmd = cmds
      .map((cmd) => {
        const pureCmd = this.commands[cmd].join(EXEC_MODE);
        return nx.tmpl(pureCmd, inArgv);
      })
      .join(EXEC_MODE);
    return !envs ? cmd : `${envs.join(' ')} ${cmd}`;
  }

  async initYcc() {
    fs.writeFileSync(this.entryfile, splYml);
    console.log('init ycc config file success, at ', this.entryfile);
  }

  async run() {
    const { argv, flags } = this.parse(YamlCommandCli);
    if (flags.init) return await this.initYcc();

    const ymlPath = this.getYmlPath(this.entryfile);
    this.conf = new NxYamlConfiguration({ path: ymlPath });

    ipt(Object.keys(this.commands), opts).then((res) => {
      const cmdStr = this.getCmdStr(res[0], argv);
      const cmdRes = execSync(cmdStr, { shell: '/bin/bash', encoding: 'utf8' });
      if (!flags.quite) {
        console.log(chalk.white.bold('commands: ') + chalk.green.bold(cmdStr));
        console.log(cmdRes.trim());
      }
    });
  }
}

export = YamlCommandCli;
