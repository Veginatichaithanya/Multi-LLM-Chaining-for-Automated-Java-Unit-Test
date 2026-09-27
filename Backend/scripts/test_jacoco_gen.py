import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import subprocess
from app.engines.maven_runner import prepare_workspace, get_maven_executable, _get_build_env

source = """package com.testforge;
public class Demo {
    public int add(int a, int b) {
        if (a > 0) {
            return a + b;
        }
        return b;
    }
}
"""

test = """package com.testforge;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class DemoTest {
    @Test
    void testPos() {
        Demo d = new Demo();
        assertEquals(3, d.add(1, 2));
    }
    @Test
    void testFail() {
        // intentional fail
        assertEquals(99, 1);
    }
}
"""

ws = prepare_workspace(source, test, with_jacoco=True)
mvn = get_maven_executable()
print("Workspace:", ws)

res = subprocess.run([mvn, "test", "jacoco:report", "-Dmaven.test.failure.ignore=true", "-B", "--no-transfer-progress"], cwd=ws, capture_output=True, text=True, env=_get_build_env())
print("Return code:", res.returncode)
print("STDOUT:\n", res.stdout[-2000:])
print("STDERR:\n", res.stderr[-2000:])

target_site = os.path.join(ws, "target", "site", "jacoco")
print("JaCoCo dir exists:", os.path.exists(target_site))
if os.path.exists(target_site):
    print("Files in jacoco dir:", os.listdir(target_site))
else:
    print("Files in target:", os.listdir(os.path.join(ws, "target")) if os.path.exists(os.path.join(ws, "target")) else "No target dir")

from app.engines.jacoco_runner import parse_jacoco_report
cov = parse_jacoco_report(os.path.join(ws, "target"))
print("Parsed cov:", cov)

from app.engines.pit_runner import run_mutation_testing
pit_res = run_mutation_testing(source, test)
print("PIT result:", pit_res)
