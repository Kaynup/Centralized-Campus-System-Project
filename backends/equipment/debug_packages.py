import importlib.util
import pkgutil
import pydantic_core
print('pydantic_core file', pydantic_core.__file__)
print('has validate_core_schema', hasattr(pydantic_core, 'validate_core_schema'))
print('contents prefix', [name for name in dir(pydantic_core) if name.startswith('validate')])
print('spec', importlib.util.find_spec('pydantic_core'))
print('submodule search locations', importlib.util.find_spec('pydantic_core').submodule_search_locations)
