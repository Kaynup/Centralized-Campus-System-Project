import importlib
import pydantic_core
print('pydantic_core module:', pydantic_core)
print('pydantic_core file:', pydantic_core.__file__)
print('validate_core_schema in module:', hasattr(pydantic_core, 'validate_core_schema'))
try:
    core = importlib.import_module('pydantic_core._pydantic_core')
    print('pydantic_core._pydantic_core module loaded')
    print('validate_core_schema in core:', hasattr(core, 'validate_core_schema'))
    print('dir core validate*', [n for n in dir(core) if 'validate' in n.lower()][:50])
except Exception as e:
    print('failed loading _pydantic_core', type(e).__name__, e)
