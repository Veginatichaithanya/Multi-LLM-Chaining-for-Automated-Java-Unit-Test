import os, sys, glob
sys.path.insert(0, ".")
import subprocess
from app.engines.pit_runner import _build_pit_pom_fragment
from app.engines.maven_runner import _POM_TEMPLATE, _get_build_env, get_maven_executable, _find_class_name, _find_test_class_name
import tempfile

source = """package com.testforge;
public class Demo {
    public int add(int a, int b) {
        if (a > 0) return a + b;
        return b;
    }
}
"""

test = """package com.testforge;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
public class DemoTest {
    @Test void testPos() { assertEquals(3, new Demo().add(1, 2)); }
}
"""

tmpdir = tempfile.mkdtemp(prefix="pit_debug_")
package = "com.testforge"
src_class = "Demo"
test_class = "DemoTest"
pit_fragment = _build_pit_pom_fragment(package, src_class, test_class)
pit_pom = _POM_TEMPLATE.replace("</plugins>", f"{pit_fragment}\n    </plugins>")

src_dir = os.path.join(tmpdir, "src", "main", "java", "com", "testforge")
test_dir = os.path.join(tmpdir, "src", "test", "java", "com", "testforge")
os.makedirs(src_dir, exist_ok=True)
os.makedirs(test_dir, exist_ok=True)

with open(os.path.join(tmpdir, "pom.xml"), "w") as f:
    f.write(pit_pom)
with open(os.path.join(src_dir, "Demo.java"), "w") as f:
    f.write(source)
with open(os.path.join(test_dir, "DemoTest.java"), "w") as f:
    f.write(test)

mvn_cmd = get_maven_executable()
proc = subprocess.run([mvn_cmd, "test", "org.pitest:pitest-maven:mutationCoverage", "-B", "--no-transfer-progress"], cwd=tmpdir, capture_output=True, text=True, env=_get_build_env())
print("Returncode:", proc.returncode)

pit_rep_dir = os.path.join(tmpdir, "target", "pit-reports")
if os.path.exists(pit_rep_dir):
    print("Files in target/pit-reports:", os.listdir(pit_rep_dir))
    found = glob.glob(os.path.join(pit_rep_dir, "**", "mutations.xml"), recursive=True)
    print("Glob found mutations.xml:", found)
else:
    print("No pit-reports dir!")
    print("STDOUT tail:\n", proc.stdout[-1500:])
